import { ChatMessage, CharacterState, SessionData } from '@/schemas/chat';
import { getAppId } from '@/config/env';
import { FALLBACK_AVATAR_NORMAL } from '@/config/constants';
import { CHARACTER_PROFILE, getActiveCharacterModel } from '@/config/characterProfile';

const STORAGE_PREFIX = 'npc_session';
const isBrowser = typeof window !== 'undefined';
const memoryStore = new Map<string, SessionData>();
const subscribers = new Map<string, Set<(data: SessionData) => void>>();

const storageKey = (userId: string) => `${STORAGE_PREFIX}:${getAppId()}:${userId}`;

const readSession = (userId: string): SessionData | null => {
  if (memoryStore.has(userId)) {
    return memoryStore.get(userId)!;
  }

  if (!isBrowser) return null;

  try {
    const payload = window.localStorage.getItem(storageKey(userId));
    if (!payload) return null;
    const parsed = JSON.parse(payload) as SessionData;
    memoryStore.set(userId, parsed);
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored session', error);
    return null;
  }
};

const writeSession = (userId: string, session: SessionData) => {
  memoryStore.set(userId, session);
  if (isBrowser) {
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to persist session locally', error);
    }
  }
  emitSession(userId, session);
};

const emitSession = (userId: string, session: SessionData) => {
  const listeners = subscribers.get(userId);
  if (!listeners) return;
  listeners.forEach((listener) => listener(session));
};

const ensureSessionListeners = (userId: string) => {
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  return subscribers.get(userId)!;
};

const defaultState: CharacterState = {
  stress: 0,
  trust: 50,
  mode: 'NORMAL',
  name: CHARACTER_PROFILE.defaultName,
  avatarUrl: FALLBACK_AVATAR_NORMAL
};

const defaultMessage: ChatMessage = {
  role: 'assistant',
  content: CHARACTER_PROFILE.defaultGreeting,
  thought: 'Thinking about lunch...',
  stressChange: 0,
  trustChange: 0,
  currentStress: 0
};

export const fetchSession = async (userId: string): Promise<SessionData> => {
  const existing = readSession(userId);
  if (existing) return existing;

  const initialSession: SessionData = {
    createdAt: Date.now(),
    characterState: defaultState,
    characterModel: getActiveCharacterModel(),
    messages: [defaultMessage]
  };

  writeSession(userId, initialSession);
  return initialSession;
};

export const subscribeSession = (
  userId: string,
  onData: (data: SessionData) => void,
  onError: (err: Error) => void
) => {
  const listeners = ensureSessionListeners(userId);
  listeners.add(onData);

  try {
    const snapshot = readSession(userId);
    if (snapshot) {
      onData(snapshot);
    }
  } catch (error) {
    onError(error as Error);
  }

  return () => {
    listeners.delete(onData);
    if (!listeners.size) {
      subscribers.delete(userId);
    }
  };
};

export const appendTurn = async (
  userId: string,
  payload: {
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    nextState: CharacterState;
  }
) => {
  const existing = await fetchSession(userId);
  const updated: SessionData = {
    ...existing,
    characterState: payload.nextState,
    messages: [...existing.messages, payload.userMessage, payload.assistantMessage]
  };

  writeSession(userId, updated);
};

export const updateAvatar = async (userId: string, avatarUrl: string) => {
  const existing = await fetchSession(userId);
  const updated: SessionData = {
    ...existing,
    characterState: {
      ...(existing.characterState ?? defaultState),
      avatarUrl
    }
  };

  writeSession(userId, updated);
};
