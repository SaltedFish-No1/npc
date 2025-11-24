/**
 * 文件：web/src/stores/uiStore.ts
 * 功能描述：UI 状态存储（设置与调试开关） | Description: UI state store for settings and debug toggles
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 Zustand
 */
import { create } from 'zustand';

/** UI 状态类型 | UI state type */
type UIState = {
  settingsOpen: boolean;
  debugOpen: boolean;
  toggleSettings: () => void;
  toggleDebug: () => void;
};

/**
 * 功能：创建 UI Store，提供设置与调试开关
 * Description: Create UI store with settings and debug toggles
 */
export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  debugOpen: false,
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
  toggleDebug: () => set((state) => ({ debugOpen: !state.debugOpen }))
}));
