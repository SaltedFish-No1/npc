import { create } from 'zustand';

export type SystemLog = {
  timestamp: number;
  source: string;
  message: string;
  level?: 'info' | 'error' | 'warn';
};

type ChatStore = {
  systemLogs: SystemLog[];
  addLog: (entry: Omit<SystemLog, 'timestamp'>) => void;
  clearLogs: () => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  systemLogs: [],
  addLog: (entry) =>
    set((state) => ({
      systemLogs: [
        ...state.systemLogs,
        { ...entry, timestamp: Date.now(), level: entry.level ?? 'info' }
      ].slice(-200)
    })),
  clearLogs: () => set({ systemLogs: [] })
}));
