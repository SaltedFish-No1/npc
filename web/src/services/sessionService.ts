import { SessionData } from '@/schemas/chat';
import { getAppId } from '@/config/env';
import { activateCharacterSession } from '@/services/chatService';

const STORAGE_PREFIX = 'npc_backend_session';
const isBrowser = typeof window !== 'undefined';
const memoryStore = new Map<string, SessionData>();
const subscribers = new Map<string, Set<(data: SessionData) => void>>();

const cacheKey = (userId: string, characterId: string) => `${userId}::${characterId}`;
const storageKey = (userId: string, characterId: string) =>
  `${STORAGE_PREFIX}:${getAppId()}:${userId}:${characterId}`;

const readSession = (userId: string, characterId: string): SessionData | undefined => {
  const key = cacheKey(userId, characterId);
  if (memoryStore.has(key)) {
    return memoryStore.get(key);
  }

  if (!isBrowser) return undefined;

  try {
    const payload = window.localStorage.getItem(storageKey(userId, characterId));
    if (!payload) return undefined;
    const parsed = JSON.parse(payload) as SessionData;
    memoryStore.set(key, parsed);
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored session', error);
    return undefined;
  }
};

const emitSession = (userId: string, characterId: string, session: SessionData) => {
  const key = cacheKey(userId, characterId);
  const listeners = subscribers.get(key);
  if (!listeners) return;
  listeners.forEach((listener) => listener(session));
};

const writeSession = (userId: string, characterId: string, session: SessionData) => {
  const key = cacheKey(userId, characterId);
  memoryStore.set(key, session);
  if (isBrowser) {
    try {
      window.localStorage.setItem(storageKey(userId, characterId), JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to persist session locally', error);
    }
  }
  emitSession(userId, characterId, session);
};

const ensureSessionListeners = (userId: string, characterId: string) => {
  const key = cacheKey(userId, characterId);
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  return subscribers.get(key)!;
};

export const fetchSession = async (
  userId: string,
  params: { characterId: string; languageCode: string; signal?: AbortSignal }
): Promise<SessionData> => {
  const existing = readSession(userId, params.characterId);

  const session = await activateCharacterSession({
    characterId: params.characterId,
    sessionId: existing?.sessionId,
    languageCode: params.languageCode,
    signal: params.signal
  });

  writeSession(userId, params.characterId, session);
  return session;
};

export const persistSessionSnapshot = (userId: string, characterId: string, session: SessionData) => {
  writeSession(userId, characterId, session);
};

export const subscribeSession = (
  userId: string,
  characterId: string,
  onData: (data: SessionData) => void,
  onError: (err: Error) => void
) => {
  const listeners = ensureSessionListeners(userId, characterId);
  listeners.add(onData);

  try {
    const snapshot = readSession(userId, characterId);
    if (snapshot) {
      onData(snapshot);
    }
  } catch (error) {
    onError(error as Error);
  }

  return () => {
    const key = cacheKey(userId, characterId);
    listeners.delete(onData);
    if (!listeners.size) {
      subscribers.delete(key);
    }
  };
};

export const resetSession = async (userId: string, characterId: string) => {
  const key = cacheKey(userId, characterId);
  memoryStore.delete(key);
  if (isBrowser) {
    try {
      window.localStorage.removeItem(storageKey(userId, characterId));
    } catch (error) {
      console.warn('Failed to remove stored session', error);
    }
  }
  subscribers.delete(key);
};
