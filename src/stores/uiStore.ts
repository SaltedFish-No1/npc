import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type UIState = {
  settingsOpen: boolean;
  debugOpen: boolean;
  apiKey: string;
  toggleSettings: () => void;
  toggleDebug: () => void;
  setApiKey: (key: string) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      settingsOpen: false,
      debugOpen: false,
      apiKey: '',
      toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
      toggleDebug: () => set((state) => ({ debugOpen: !state.debugOpen })),
      setApiKey: (key: string) => set({ apiKey: key })
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ apiKey: state.apiKey })
    }
  )
);
