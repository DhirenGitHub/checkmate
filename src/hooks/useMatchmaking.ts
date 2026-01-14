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

  const setupConnectionHandlers = useCallback((conn: DataConnection, isInitiator: boolean) => {
    connectionRef.current = conn;

    conn.on('open', () => {
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
    });

    conn.on('data', (data) => {
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
      } else if (payload.type === 'sync-request' && userData) {
        // Partner is asking for our message history
        conn.send({ type: 'sync-response', messages: userData.messages });
      } else if (payload.type === 'sync-response') {
        // Receive partner's message history
        const syncData = data as { type: string; messages: StoredMessage[] };
        syncData.messages.forEach((msg: StoredMessage) => {
          // Only add messages from peer that we don't have
          if (msg.sender === 'me') {
            const peerMsg: StoredMessage = { ...msg, sender: 'peer' };
            onMessageReceived(peerMsg);
          }
        });
      }
    });

    conn.on('close', () => {
      setIsConnected(false);
      connectionRef.current = null;
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }, [userData, onPartnerFound, onMessageReceived]);

  const connectToPartner = useCallback((partnerId: string) => {
    if (!peerRef.current || !userData) return;

    // Try to connect to partner's peer ID
    const peerIdToConnect = `checkmate-${partnerId}`;
    const conn = peerRef.current.connect(peerIdToConnect, { reliable: true });
    setupConnectionHandlers(conn, true);
  }, [userData, setupConnectionHandlers]);

  const searchForPartner = useCallback(() => {
    if (!peerRef.current || !userData) return;

    const oppositeGender = userData.odad === 'male' ? 'female' : 'male';
    const targetChannel = getChannelId(oppositeGender);

    // Try to connect to someone waiting in opposite gender queue
    const conn = peerRef.current.connect(targetChannel, { reliable: true });

    conn.on('open', () => {
      setupConnectionHandlers(conn, true);
    });

    conn.on('error', () => {
      // No one available, keep searching
    });
  }, [userData, setupConnectionHandlers]);

  // Initialize peer and start matchmaking
  useEffect(() => {
    if (!userData) return;

    // If we already have a partner, try to connect directly to them
    if (userData.partnerId) {
      const peer = new Peer(`checkmate-${userData.odaId}`);
      peerRef.current = peer;

      peer.on('open', () => {
        connectToPartner(userData.partnerId!);
        setIsSearching(true);
      });

      peer.on('connection', (conn) => {
        setupConnectionHandlers(conn, false);
      });

      peer.on('error', (err) => {
        if (err.type !== 'peer-unavailable') {
          setConnectionError(`Connection error: ${err.message}`);
        }
      });

      // Retry connecting to partner periodically
      searchIntervalRef.current = setInterval(() => {
        if (!isConnected && userData.partnerId) {
          connectToPartner(userData.partnerId);
        }
      }, 3000);

      return () => {
        if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
        peer.destroy();
      };
    }

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
    };
  }, [userData?.odaId, userData?.partnerId, userData?.odad]);

  const sendMessage = useCallback((text: string): StoredMessage | null => {
    const message: StoredMessage = {
      id: crypto.randomUUID(),
      text,
      sender: 'me',
      timestamp: new Date().toISOString(),
    };

    // Send if connected
    if (connectionRef.current && isConnected) {
      connectionRef.current.send({ type: 'message', message });
    }

    return message;
  }, [isConnected]);

  return {
    isSearching,
    isConnected,
    sendMessage,
    connectionError,
  };
}
