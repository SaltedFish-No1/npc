import { create } from 'zustand';

type UIState = {
  settingsOpen: boolean;
  debugOpen: boolean;
  toggleSettings: () => void;
  toggleDebug: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  debugOpen: false,
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
  toggleDebug: () => set((state) => ({ debugOpen: !state.debugOpen }))
}));
