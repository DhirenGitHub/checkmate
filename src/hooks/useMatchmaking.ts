import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { Gender, StoredMessage, UserData } from './useStorage';

type DataConnection = ReturnType<Peer['connect']>;

interface UseMatchmakingProps {
  userData: UserData | null;
  onPartnerFound: (partnerId: string) => void;
  onMessageReceived: (message: StoredMessage) => void;
}

interface UseMatchmakingReturn {
  isSearching: boolean;
  isConnected: boolean;
  sendMessage: (text: string) => StoredMessage | null;
  connectionError: string | null;
}

// Channel names for matchmaking - users wait on their gender's channel
// and try to connect to opposite gender's channel
const getChannelId = (gender: Gender) => `checkmate-queue-${gender}`;

export function useMatchmaking({
  userData,
  onPartnerFound,
  onMessageReceived,
}: UseMatchmakingProps): UseMatchmakingReturn {
  const [isSearching, setIsSearching] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const searchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectedRef = useRef(false); // Track connection state in ref for callbacks

  const setupConnectionHandlers = useCallback((conn: DataConnection, isInitiator: boolean) => {
    // Don't replace an existing working connection
    if (isConnectedRef.current && connectionRef.current) {
      return;
    }

    connectionRef.current = conn;

    const handleOpen = () => {
      isConnectedRef.current = true;
      setIsConnected(true);
      setIsSearching(false);
      setConnectionError(null);

      // Clear search interval
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
        searchIntervalRef.current = null;
      }

      // Exchange user IDs to establish permanent pairing
      if (isInitiator && userData) {
        conn.send({ type: 'handshake', odaId: userData.odaId });
      }
    };

    const handleData = (data: unknown) => {
      const payload = data as { type: string; odaId?: string; message?: StoredMessage };

      if (payload.type === 'handshake' && payload.odaId) {
        onPartnerFound(payload.odaId);
        // Send back our ID
        if (userData) {
          conn.send({ type: 'handshake-ack', odaId: userData.odaId });
        }
      } else if (payload.type === 'handshake-ack' && payload.odaId) {
        onPartnerFound(payload.odaId);
      } else if (payload.type === 'message' && payload.message) {
        // Message received from peer - flip the sender perspective
        const receivedMessage: StoredMessage = {
          ...payload.message,
          sender: 'peer',
        };
        onMessageReceived(receivedMessage);
      }
    };

    const handleClose = () => {
      isConnectedRef.current = false;
      setIsConnected(false);
      connectionRef.current = null;
    };

    const handleError = (err: Error) => {
      console.error('Connection error:', err);
    };

    conn.on('open', handleOpen);
    conn.on('data', handleData);
    conn.on('close', handleClose);
    conn.on('error', handleError);

    // If connection is already open (for incoming connections), trigger open handler
    if (conn.open) {
      handleOpen();
    }
  }, [userData, onPartnerFound, onMessageReceived]);

  const searchForPartner = useCallback(() => {
    if (!peerRef.current || !userData || isConnectedRef.current) return;

    const oppositeGender = userData.odad === 'male' ? 'female' : 'male';
    const targetChannel = getChannelId(oppositeGender);

    // Try to connect to someone waiting in opposite gender queue
    const conn = peerRef.current.connect(targetChannel, { reliable: true });

    conn.on('open', () => {
      if (!isConnectedRef.current) {
        setupConnectionHandlers(conn, true);
      }
    });

    conn.on('error', () => {
      // No one available, keep searching
    });
  }, [userData, setupConnectionHandlers]);

  // Initialize peer and start matchmaking
  useEffect(() => {
    if (!userData) return;

    // No partner yet - join matchmaking queue
    const myChannel = getChannelId(userData.odad);
    const peer = new Peer(myChannel);
    peerRef.current = peer;

    peer.on('open', () => {
      setIsSearching(true);
      // Start searching for opposite gender
      searchForPartner();
      searchIntervalRef.current = setInterval(searchForPartner, 2000);
    });

    peer.on('connection', (conn) => {
      // Someone found us!
      setupConnectionHandlers(conn, false);
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Queue position taken, use unique ID instead
        const uniquePeer = new Peer(`checkmate-${userData.odaId}`);
        peerRef.current = uniquePeer;

        uniquePeer.on('open', () => {
          setIsSearching(true);
          searchForPartner();
          searchIntervalRef.current = setInterval(searchForPartner, 2000);
        });

        uniquePeer.on('connection', (conn) => {
          setupConnectionHandlers(conn, false);
        });

        uniquePeer.on('error', (e) => {
          if (e.type !== 'peer-unavailable') {
            setConnectionError(`Error: ${e.message}`);
          }
        });
      } else if (err.type !== 'peer-unavailable') {
        setConnectionError(`Error: ${err.message}`);
      }
    });

    return () => {
      if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
      peerRef.current?.destroy();
      isConnectedRef.current = false;
    };
  }, [userData?.odaId, userData?.odad, searchForPartner, setupConnectionHandlers]);

  const sendMessage = useCallback((text: string): StoredMessage | null => {
    const message: StoredMessage = {
      id: crypto.randomUUID(),
      text,
      sender: 'me',
      timestamp: new Date().toISOString(),
    };

    // Send if connected
    if (connectionRef.current && connectionRef.current.open) {
      connectionRef.current.send({ type: 'message', message });
    }

    return message;
  }, []);

  return {
    isSearching,
    isConnected,
    sendMessage,
    connectionError,
  };
}
