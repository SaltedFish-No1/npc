import { nanoid } from 'nanoid';

import { CharacterProfile, CharacterService } from '../characters/characterService.js';
import { CharacterState, ChatMessage, SessionData } from '../../schemas/chat.js';
import { SessionStore } from './sessionStore.js';

const DEFAULT_LANGUAGE = 'en';

export class SessionService {
  constructor(
    private readonly store: SessionStore,
    private readonly characterService: CharacterService
  ) {}

  async getOrCreateSession(params: {
    sessionId?: string;
    characterId?: string;
    languageCode?: string;
  }): Promise<SessionData> {
    if (params.sessionId) {
      const existing = await this.store.get(params.sessionId);
      if (existing) {
        await this.store.touch(existing.sessionId);
        return existing;
      }
    }

    if (!params.characterId) {
      throw new Error('characterId is required when creating a new session');
    }

    const profile = this.characterService.getCharacterOrThrow(params.characterId);
    const session = this.buildInitialSession(profile, params.languageCode ?? DEFAULT_LANGUAGE);
    await this.store.set(session);
    return session;
  }

  async appendTurn(sessionId: string, payload: {
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    characterState: CharacterState;
  }): Promise<SessionData> {
    if (payload.userMessage.role !== 'user') {
      throw new Error('userMessage must have role="user"');
    }
    if (payload.assistantMessage.role !== 'assistant') {
      throw new Error('assistantMessage must have role="assistant"');
    }
    const existing = await this.store.get(sessionId);
    if (!existing) {
      throw new Error('Session not found');
    }

    const updated: SessionData = {
      ...existing,
      updatedAt: Date.now(),
      version: existing.version + 1,
      characterState: payload.characterState,
      messages: [...existing.messages, payload.userMessage, payload.assistantMessage]
    };

    await this.store.set(updated);
    return updated;
  }

  async updateAvatar(sessionId: string, avatarUrl: string): Promise<SessionData> {
    const existing = await this.store.get(sessionId);
    if (!existing) {
      throw new Error('Session not found');
    }

    const updated: SessionData = {
      ...existing,
      updatedAt: Date.now(),
      version: existing.version + 1,
      characterState: {
        ...existing.characterState,
        avatarUrl
      }
    };
    await this.store.set(updated);
    return updated;
  }

  private buildInitialSession(profile: CharacterProfile, languageCode: string): SessionData {
    const normalizedLang = languageCode.toLowerCase();
    const sessionId = nanoid();
    const initialAssistant: ChatMessage = {
      role: 'assistant',
      content: profile.defaultGreeting,
      thought: 'Opening line',
      stressChange: 0,
      trustChange: 0,
      currentStress: profile.defaultState.stress
    };

    return {
      sessionId,
      characterId: profile.id,
      languageCode: normalizedLang,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      characterState: { ...profile.defaultState, name: profile.name },
      messages: [initialAssistant]
    };
  }
}
