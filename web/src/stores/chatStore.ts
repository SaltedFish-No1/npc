/**
 * 文件：web/src/stores/chatStore.ts
 * 功能描述：系统日志状态存储（Zustand） | Description: Zustand store for system logs
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 Zustand
 */
import { create } from 'zustand';

/** 系统日志项 | System log entry */
export type SystemLog = {
  timestamp: number;
  source: string;
  message: string;
  level?: 'info' | 'error' | 'warn';
};

/** 日志存储类型 | Chat store type */
type ChatStore = {
  systemLogs: SystemLog[];
  addLog: (entry: Omit<SystemLog, 'timestamp'>) => void;
  clearLogs: () => void;
};

/**
 * 功能：创建系统日志 Store，保留最近 200 条记录
 * Description: Create system log store keeping last 200 entries
 */
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
