import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, loginUser, logoutUser, registerUser } from '../firebase/auth';
import { getUserData, saveUserData } from '../firebase/firestore';
import useSettingsStore from '../stores/useSettingsStore';
import useFlashcardStore from '../stores/useFlashcardStore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadFromFirebase = useSettingsStore((state) => state.loadFromFirebase);
  const loadFlashcardsFromFirebase = useFlashcardStore((state) => state.loadFromFirebase);
  const migrateFromLocalStorage = useFlashcardStore((state) => state.migrateFromLocalStorage);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Kullanıcı giriş yaptıysa Firestore'dan verilerini al
        const { data } = await getUserData(firebaseUser.uid);
        setUserData(data);

        // Settings'i Firestore'dan yükle
        if (data?.settings) {
          loadFromFirebase(data.settings);
        }

        // Flashcards'i yükle veya migrate et
        if (data?.flashcards) {
          // Firebase'de veri varsa yükle
          await loadFlashcardsFromFirebase();
        } else {
          // Firebase'de veri yoksa local storage'dan migrate et
          await migrateFromLocalStorage();
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [loadFromFirebase, loadFlashcardsFromFirebase, migrateFromLocalStorage]);

  const login = async (email, password) => {
    setLoading(true);
    const result = await loginUser(email, password);
    setLoading(false);
    return result;
  };

  const register = async (email, password, displayName) => {
    setLoading(true);
    const result = await registerUser(email, password, displayName);

    if (result.user) {
      // İlk kayıtta boş kullanıcı verisi oluştur
      await saveUserData(result.user.uid, {
        email: result.user.email,
        displayName: displayName || '',
        createdAt: new Date().toISOString(),
        decks: [],
        settings: {
          theme: 'light',
          language: 'en'
        }
      });
    }

    setLoading(false);
    return result;
  };

  const logout = async () => {
    setLoading(true);
    const result = await logoutUser();
    setLoading(false);
    return result;
  };

  const updateUserDataContext = async (updates) => {
    if (user) {
      const { error } = await saveUserData(user.uid, updates);
      if (!error) {
        setUserData({ ...userData, ...updates });
      }
      return { error };
    }
    return { error: 'No user logged in' };
  };

  const value = {
    user,
    userData,
    loading,
    login,
    register,
    logout,
    updateUserData: updateUserDataContext
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
