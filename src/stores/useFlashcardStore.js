import { create } from 'zustand';
import { saveUserData, getUserData } from '../firebase/firestore';
import { auth } from '../firebase/config';

const useFlashcardStore = create((set, get) => ({
  // State
  practiceCards: [],
  gameCards: [],
  isLoading: false,
  error: null,

  // Firebase'e kaydet
  syncToFirebase: async () => {
    const user = auth.currentUser;
    if (!user) return;

    const { practiceCards, gameCards } = get();
    try {
      await saveUserData(user.uid, {
        flashcards: {
          practiceCards,
          gameCards,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Firebase sync error:', error);
      set({ error: error.message });
    }
  },

  // Firebase'den yükle
  loadFromFirebase: async () => {
    const user = auth.currentUser;
    if (!user) return;

    set({ isLoading: true });
    try {
      const { data } = await getUserData(user.uid);
      if (data?.flashcards) {
        set({
          practiceCards: data.flashcards.practiceCards || [],
          gameCards: data.flashcards.gameCards || [],
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Firebase load error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Practice kartları ekle
  addPracticeCards: async (cards) => {
    const { practiceCards } = get();
    const updatedCards = [...practiceCards, ...cards];
    set({ practiceCards: updatedCards });
    await get().syncToFirebase();
  },

  // Game kartları ekle
  addGameCards: async (cards) => {
    const { gameCards } = get();
    const updatedCards = [...gameCards, ...cards];
    set({ gameCards: updatedCards });
    await get().syncToFirebase();
  },

  // Practice kartı güncelle
  updatePracticeCard: async (id, updates) => {
    const { practiceCards } = get();
    const updatedCards = practiceCards.map(card =>
      card.id === id ? { ...card, ...updates } : card
    );
    set({ practiceCards: updatedCards });
    await get().syncToFirebase();
  },

  // Game kartı güncelle
  updateGameCard: async (id, updates) => {
    const { gameCards } = get();
    const updatedCards = gameCards.map(card =>
      card.id === id ? { ...card, ...updates } : card
    );
    set({ gameCards: updatedCards });
    await get().syncToFirebase();
  },

  // Practice kartı sil
  deletePracticeCard: async (id) => {
    const { practiceCards } = get();
    const updatedCards = practiceCards.filter(card => card.id !== id);
    set({ practiceCards: updatedCards });
    await get().syncToFirebase();
  },

  // Game kartı sil
  deleteGameCard: async (id) => {
    const { gameCards } = get();
    const updatedCards = gameCards.filter(card => card.id !== id);
    set({ gameCards: updatedCards });
    await get().syncToFirebase();
  },

  // Tüm kartları temizle
  clearAllCards: async () => {
    set({ practiceCards: [], gameCards: [] });
    await get().syncToFirebase();
  },

  // Local Storage'dan Firebase'e migration
  migrateFromLocalStorage: async () => {
    try {
      const practiceData = JSON.parse(localStorage.getItem('flashcardData') || '[]');
      const gameData = JSON.parse(localStorage.getItem('gameFlashcardData') || '[]');

      if (practiceData.length > 0 || gameData.length > 0) {
        set({ practiceCards: practiceData, gameCards: gameData });
        await get().syncToFirebase();

        // Migration başarılıysa local storage'ı temizle
        localStorage.removeItem('flashcardData');
        localStorage.removeItem('gameFlashcardData');

        console.log('✅ Migration completed:', {
          practice: practiceData.length,
          game: gameData.length
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      set({ error: error.message });
    }
  }
}));

export default useFlashcardStore;
