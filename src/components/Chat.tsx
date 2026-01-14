import { useState, useRef, useEffect, useCallback } from 'react';
import { useStorage } from '../hooks/useStorage';
import { useMatchmaking } from '../hooks/useMatchmaking';
import type { Gender, StoredMessage } from '../hooks/useStorage';

interface MessageBubbleProps {
  message: StoredMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isMe = message.sender === 'me';
  const time = new Date(message.timestamp);

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
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

interface GenderSelectionProps {
  onSelect: (gender: Gender) => void;
}

function GenderSelection({ onSelect }: GenderSelectionProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Checkmate</h1>
        <p className="text-gray-400 mb-8">Anonymous chat with a stranger</p>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Select your gender</h2>

          <div className="flex gap-4">
            <button
              onClick={() => onSelect('male')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
            >
              <span className="text-2xl mb-2 block">♂</span>
              Male
            </button>
            <button
              onClick={() => onSelect('female')}
              className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
            >
              <span className="text-2xl mb-2 block">♀</span>
              Female
            </button>
          </div>

          <p className="text-gray-500 text-sm mt-6">
            You'll be matched with someone of the opposite gender
          </p>
        </div>
      </div>
    </div>
  );
}

interface ChatScreenProps {
  messages: StoredMessage[];
  onSendMessage: (text: string) => void;
  isConnected: boolean;
  isSearching: boolean;
  partnerGender: Gender | null;
}

function ChatScreen({ messages, onSendMessage, isConnected, isSearching, partnerGender }: ChatScreenProps) {
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
          <h1 className="text-lg font-semibold text-white">Checkmate</h1>
          <p className="text-xs text-gray-400">
            {partnerGender ? `Chatting with a ${partnerGender}` : 'Anonymous chat'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSearching && !isConnected ? (
            <>
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-yellow-400">Searching...</span>
            </>
          ) : isConnected ? (
            <>
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-green-400">Online</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
              <span className="text-sm text-gray-400">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Status banner */}
      {!isConnected && (
        <div className={`px-4 py-2 text-center text-sm ${isSearching ? 'bg-yellow-900/30 text-yellow-300' : 'bg-gray-800 text-gray-400'}`}>
          {isSearching ? (
            <>Looking for your match... You can send messages while waiting!</>
          ) : (
            <>Your partner is offline. Messages will be delivered when they return.</>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No messages yet</p>
              <p className="text-gray-600 text-sm">Send a message to start the conversation!</p>
            </div>
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

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400 mt-4">Loading...</p>
    </div>
  );
}

export function Chat() {
  const { userData, isLoading, initializeUser, setPartner, addMessage, getOppositeGender } = useStorage();
  const [messages, setMessages] = useState<StoredMessage[]>([]);

  // Initialize messages from storage
  useEffect(() => {
    if (userData?.messages) {
      setMessages(userData.messages);
    }
  }, [userData?.messages]);

  const handlePartnerFound = useCallback((partnerId: string) => {
    setPartner(partnerId);
  }, [setPartner]);

  const handleMessageReceived = useCallback((message: StoredMessage) => {
    // Check if message already exists to avoid duplicates
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
    addMessage(message);
  }, [addMessage]);

  const { isSearching, isConnected, sendMessage, connectionError } = useMatchmaking({
    userData,
    onPartnerFound: handlePartnerFound,
    onMessageReceived: handleMessageReceived,
  });

  const handleSendMessage = useCallback((text: string) => {
    const message = sendMessage(text);
    if (message) {
      setMessages((prev) => [...prev, message]);
      addMessage(message);
    }
  }, [sendMessage, addMessage]);

  const handleGenderSelect = useCallback((gender: Gender) => {
    initializeUser(gender);
  }, [initializeUser]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!userData) {
    return <GenderSelection onSelect={handleGenderSelect} />;
  }

  if (connectionError) {
    console.error('Connection error:', connectionError);
  }

  return (
    <ChatScreen
      messages={messages}
      onSendMessage={handleSendMessage}
      isConnected={isConnected}
      isSearching={isSearching}
      partnerGender={getOppositeGender()}
    />
  );
}
