import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_CONFIG } from '../constants';
import { saveUserData } from '../firebase/firestore';
import { auth } from '../firebase/config';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      targetGoal: APP_CONFIG.DEFAULT_TARGET_GOAL,
      currentProgress: 0,
      lastProgressDate: new Date().toDateString(), // Günlük sıfırlama için
      theme: 'default', // default, midnight, ocean, forest, purple
      language: 'en',
      soundEnabled: true,
      animationsEnabled: true,
      isInitialized: false,

      // Günlük ilerlemeyi kontrol et ve gerekirse sıfırla
      checkDailyReset: () => {
        const today = new Date().toDateString();
        const lastDate = get().lastProgressDate;

        if (lastDate !== today) {
          // Yeni gün başladı, ilerlemeyi sıfırla
          set({
            currentProgress: 0,
            lastProgressDate: today
          });
          // Firebase'e kaydet
          get().syncToFirebase();
          return true; // Sıfırlandı
        }
        return false; // Aynı gün
      },

      // Firebase'e senkronize et
      syncToFirebase: async () => {
        const user = auth.currentUser;
        if (user) {
          const { isInitialized, syncToFirebase, loadFromFirebase, checkDailyReset, ...settings } = get();
          await saveUserData(user.uid, { settings });
        }
      },

      // Firebase'den yükle
      loadFromFirebase: (firebaseSettings) => {
        if (firebaseSettings) {
          set({ ...firebaseSettings, isInitialized: true });
          // Yükledikten sonra günlük sıfırlamayı kontrol et
          get().checkDailyReset();
        }
      },

      // Actions
      setTargetGoal: async (goal) => {
        const validGoal = parseInt(goal, 10) || APP_CONFIG.DEFAULT_TARGET_GOAL;
        set({ targetGoal: validGoal, currentProgress: 0 });
        await get().syncToFirebase();
      },

      incrementProgress: async () => {
        // Önce günlük sıfırlama kontrolü yap
        get().checkDailyReset();

        set((state) => ({
          currentProgress: state.currentProgress + 1,
          lastProgressDate: new Date().toDateString()
        }));
        await get().syncToFirebase();
      },

      resetProgress: async () => {
        set({
          currentProgress: 0,
          lastProgressDate: new Date().toDateString()
        });
        await get().syncToFirebase();
      },

      setTheme: async (theme) => {
        set({ theme });
        await get().syncToFirebase();
      },

      setLanguage: async (language) => {
        set({ language });
        await get().syncToFirebase();
      },

      toggleSound: async () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
        await get().syncToFirebase();
      },

      toggleAnimations: async () => {
        set((state) => ({ animationsEnabled: !state.animationsEnabled }));
        await get().syncToFirebase();
      },

      // Computed values
      getProgressPercentage: () => {
        const { currentProgress, targetGoal } = get();
        return targetGoal > 0 ? Math.round((currentProgress / targetGoal) * 100) : 0;
      },

      isGoalCompleted: () => {
        const { currentProgress, targetGoal } = get();
        return currentProgress >= targetGoal;
      }
    }),
    {
      name: APP_CONFIG.STORAGE_KEYS.SETTINGS,
    }
  )
);

export default useSettingsStore;
