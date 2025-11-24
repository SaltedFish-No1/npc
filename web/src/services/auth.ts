/**
 * 文件：web/src/services/auth.ts
 * 功能描述：匿名鉴权服务，提供用户ID生成、持久化与订阅 | Description: Anonymous auth service providing user ID generation, persistence and subscriptions
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：使用浏览器 localStorage
 */
const STORAGE_KEY = 'npc_anon_user_id';
type Listener = (user: AnonymousUser | null) => void;

const listeners = new Set<Listener>();
let currentUser: AnonymousUser | null = null;

const isBrowser = typeof window !== 'undefined';

const generateId = () => {
  if (isBrowser && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const loadUserFromStorage = (): AnonymousUser | null => {
  if (!isBrowser) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return { uid: stored, isAnonymous: true };
  } catch (error) {
    console.warn('Failed to read anonymous user id', error);
    return null;
  }
};

const persistUser = (user: AnonymousUser) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, user.uid);
  } catch (error) {
    console.warn('Failed to persist anonymous user id', error);
  }
};

const notify = () => {
  listeners.forEach((listener) => listener(currentUser));
};

/**
 * 功能：确保存在匿名用户（读取存储或生成新ID）
 * Description: Ensure an anonymous user exists (from storage or generate new)
 * @returns {AnonymousUser} 匿名用户 | Anonymous user
 */
export const ensureAuth = (): AnonymousUser => {
  if (currentUser) return currentUser;

  const existing = loadUserFromStorage();
  if (existing) {
    currentUser = existing;
    notify();
    return existing;
  }

  const created: AnonymousUser = { uid: generateId(), isAnonymous: true };
  currentUser = created;
  persistUser(created);
  notify();
  return created;
};

/**
 * 功能：订阅匿名用户变更（立即推送当前值）
 * Description: Subscribe to anonymous user changes (push current value immediately)
 */
export const subscribeAuth = (cb: Listener) => {
  listeners.add(cb);
  cb(currentUser);
  return () => {
    listeners.delete(cb);
  };
};

/**
 * 功能：登出匿名用户并清理存储
 * Description: Sign out anonymous user and clear storage
 */
export const signOut = () => {
  currentUser = null;
  if (isBrowser) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  notify();
};

export type AnonymousUser = {
  uid: string;
  isAnonymous: true;
};
