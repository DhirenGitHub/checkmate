import { useState, useRef, useEffect } from 'react';
import { usePeerChat } from '../hooks/usePeerChat';
import type { Message } from '../hooks/usePeerChat';

function MessageBubble({ message }: { message: Message }) {
  const isMe = message.sender === 'me';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
          isMe
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-700 text-gray-100 rounded-bl-md'
        }`}
      >
        <p className="break-words">{message.text}</p>
        <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function ConnectionScreen({
  onCreateRoom,
  onJoinRoom,
  error,
}: {
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  error: string | null;
}) {
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      onJoinRoom(joinRoomId.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-white text-center mb-2">Checkmate</h1>
        <p className="text-gray-400 text-center mb-8">Peer-to-peer chat, no servers needed</p>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-6 mb-4">
          <h2 className="text-xl font-semibold text-white mb-4">Create a Room</h2>
          <p className="text-gray-400 text-sm mb-4">
            Start a new chat room and share the code with your friend
          </p>
          <button
            onClick={onCreateRoom}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Create Room
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="text-gray-500 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Join a Room</h2>
          <p className="text-gray-400 text-sm mb-4">
            Enter the room code shared by your friend
          </p>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="flex-1 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
              maxLength={6}
            />
            <button
              type="submit"
              disabled={!joinRoomId.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function WaitingScreen({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Waiting for connection...</h2>
        <p className="text-gray-400 mb-6">Share this room code with your friend:</p>

        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <p className="text-3xl font-mono font-bold text-blue-400 tracking-wider">{roomId}</p>
        </div>

        <button
          onClick={copyToClipboard}
          className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
    </div>
  );
}

function ChatScreen({
  messages,
  onSendMessage,
  roomId,
}: {
  messages: Message[];
  onSendMessage: (text: string) => void;
  roomId: string;
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Checkmate Chat</h1>
          <p className="text-xs text-gray-400">Room: {roomId}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-sm text-green-400">Connected</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Say hello!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export function Chat() {
  const {
    connectionStatus,
    messages,
    createRoom,
    joinRoom,
    sendMessage,
    roomId,
    error,
  } = usePeerChat();

  if (connectionStatus === 'connected' && roomId) {
    return (
      <ChatScreen
        messages={messages}
        onSendMessage={sendMessage}
        roomId={roomId}
      />
    );
  }

  if (connectionStatus === 'waiting' && roomId) {
    return <WaitingScreen roomId={roomId} />;
  }

  return (
    <ConnectionScreen
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      error={error}
    />
  );
}
