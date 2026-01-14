import { useState, useCallback } from 'react';

export type Gender = 'male' | 'female';

export interface StoredMessage {
  id: string;
  text: string;
  sender: 'me' | 'peer';
  timestamp: string;
}

export interface UserData {
  odad: Gender;
  odaId: string;
  partnerId: string | null;
  messages: StoredMessage[];
}

// const STORAGE_KEY = 'checkmate_user';

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function useStorage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading] = useState(false); // No loading needed without storage

  // COMMENTED OUT: localStorage persistence for easier testing
  // useEffect(() => {
  //   const stored = localStorage.getItem(STORAGE_KEY);
  //   if (stored) {
  //     try {
  //       setUserData(JSON.parse(stored));
  //     } catch {
  //       setUserData(null);
  //     }
  //   }
  //   setIsLoading(false);
  // }, []);

  const saveUserData = useCallback((data: UserData) => {
    // localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setUserData(data);
  }, []);

  const initializeUser = useCallback((odad: Gender) => {
    const newUser: UserData = {
      odad,
      odaId: generateUserId(),
      partnerId: null,
      messages: [],
    };
    saveUserData(newUser);
    return newUser;
  }, [saveUserData]);

  const setPartner = useCallback((partnerId: string) => {
    if (!userData) return;
    const updated = { ...userData, partnerId };
    saveUserData(updated);
  }, [userData, saveUserData]);

  const addMessage = useCallback((message: StoredMessage) => {
    if (!userData) return;
    const updated = {
      ...userData,
      messages: [...userData.messages, message],
    };
    saveUserData(updated);
  }, [userData, saveUserData]);

  const getOppositeGender = useCallback((): Gender | null => {
    if (!userData) return null;
    return userData.odad === 'male' ? 'female' : 'male';
  }, [userData]);

  return {
    userData,
    isLoading,
    initializeUser,
    setPartner,
    addMessage,
    getOppositeGender,
  };
}
