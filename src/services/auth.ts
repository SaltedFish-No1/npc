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

export const ensureAuth = async (): Promise<AnonymousUser> => {
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

export const subscribeAuth = (cb: Listener) => {
  listeners.add(cb);
  cb(currentUser);
  return () => {
    listeners.delete(cb);
  };
};

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
