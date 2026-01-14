import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';

type DataConnection = ReturnType<Peer['connect']>;

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'peer';
  timestamp: Date;
}

interface UsePeerChatReturn {
  peerId: string | null;
  isConnected: boolean;
  messages: Message[];
  connectionStatus: 'disconnected' | 'waiting' | 'connected';
  createRoom: () => void;
  joinRoom: (roomId: string) => void;
  sendMessage: (text: string) => void;
  roomId: string | null;
  error: string | null;
}

export function usePeerChat(): UsePeerChatReturn {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'waiting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    return () => {
      connectionRef.current?.close();
      peerRef.current?.destroy();
    };
  }, []);

  const handleConnection = useCallback((conn: DataConnection) => {
    connectionRef.current = conn;

    conn.on('open', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
    });

    conn.on('data', (data) => {
      const messageData = data as { text: string; id: string; timestamp: string };
      const newMessage: Message = {
        id: messageData.id,
        text: messageData.text,
        sender: 'peer',
        timestamp: new Date(messageData.timestamp),
      };
      setMessages((prev) => [...prev, newMessage]);
    });

    conn.on('close', () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      connectionRef.current = null;
    });

    conn.on('error', (err) => {
      setError(`Connection error: ${err.message}`);
    });
  }, []);

  const initializePeer = useCallback((id?: string): Promise<Peer> => {
    return new Promise((resolve, reject) => {
      const peer = id ? new Peer(id) : new Peer();

      peer.on('open', (peerId) => {
        setPeerId(peerId);
        peerRef.current = peer;
        resolve(peer);
      });

      peer.on('connection', (conn) => {
        handleConnection(conn);
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          setError('Room already exists or ID is taken. Try a different room name.');
        } else if (err.type === 'peer-unavailable') {
          setError('Room not found. Make sure the room ID is correct.');
        } else {
          setError(`Error: ${err.message}`);
        }
        reject(err);
      });
    });
  }, [handleConnection]);

  const createRoom = useCallback(async () => {
    setError(null);
    setConnectionStatus('waiting');

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      await initializePeer(`checkmate-${roomCode}`);
      setRoomId(roomCode);
    } catch {
      setConnectionStatus('disconnected');
    }
  }, [initializePeer]);

  const joinRoom = useCallback(async (targetRoomId: string) => {
    setError(null);
    setConnectionStatus('waiting');

    try {
      const peer = await initializePeer();
      const conn = peer.connect(`checkmate-${targetRoomId.toUpperCase()}`);
      handleConnection(conn);
      setRoomId(targetRoomId.toUpperCase());
    } catch {
      setConnectionStatus('disconnected');
    }
  }, [initializePeer, handleConnection]);

  const sendMessage = useCallback((text: string) => {
    if (!connectionRef.current || !isConnected) return;

    const message: Message = {
      id: crypto.randomUUID(),
      text,
      sender: 'me',
      timestamp: new Date(),
    };

    connectionRef.current.send({
      id: message.id,
      text: message.text,
      timestamp: message.timestamp.toISOString(),
    });

    setMessages((prev) => [...prev, message]);
  }, [isConnected]);

  return {
    peerId,
    isConnected,
    messages,
    connectionStatus,
    createRoom,
    joinRoom,
    sendMessage,
    roomId,
    error,
  };
}
