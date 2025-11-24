/**
 * 文件：backend/src/services/sessions/sessionService.ts
 * 功能描述：会话生命周期管理（创建/读取/追加回合/头像更新） | Description: Manage session lifecycle: create/get/append turns/update avatar
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 SessionStore、CharacterService 与模型
 */
import { nanoid } from 'nanoid';

import { CharacterProfile, CharacterService } from '../characters/characterService.js';
import { CharacterState, ChatMessage, SessionData } from '../../schemas/chat.js';
import { SessionStore } from './sessionStore.js';
import type { SessionCache } from '../../cache/sessionCache.js';

const DEFAULT_LANGUAGE = 'en';

/**
 * 会话服务：封装会话相关操作与业务规则
 * SessionService: Encapsulates session operations and business rules
 */
export class SessionService {
  constructor(
    private readonly store: SessionStore,
    private readonly characterService: CharacterService,
    private readonly cache?: SessionCache | null
  ) {}

  /**
   * 功能：根据 `sessionId` 读取或根据 `characterId` 创建新会话；语言变更时重建
   * Description: Get by `sessionId` or create by `characterId`; rebuild when language changes
   * @param {Object} params - 入参 | Parameters
   * @param {string} [params.sessionId] - 现有会话ID | Existing session ID
   * @param {string} [params.characterId] - 角色ID（创建必需） | Character ID (required for create)
   * @param {string} [params.languageCode] - 目标语言码 | Target language code
   * @returns {Promise<SessionData>} 会话数据 | Session data
   */
  async getOrCreateSession(params: {
    sessionId?: string;
    characterId?: string;
    languageCode?: string;
  }): Promise<SessionData> {
    const requestedLanguage = (params.languageCode ?? DEFAULT_LANGUAGE).toLowerCase();

    if (params.sessionId) {
      const cached = await this.cache?.get(params.sessionId);
      const existing = cached ?? (await this.store.get(params.sessionId));
      if (existing) {
        // 业务关键逻辑：语言切换时，删除旧会话并重建，避免跨语言历史污染
        if (existing.languageCode !== requestedLanguage) {
          await this.store.delete(existing.sessionId);
          await this.cache?.delete(existing.sessionId);
        } else {
          await this.store.touch(existing.sessionId);
          await this.cache?.touch(existing.sessionId);
          return existing;
        }
      }
    }

    if (!params.characterId) {
      throw new Error('characterId is required when creating a new session');
    }

    const profile = this.characterService.getCharacterOrThrow(params.characterId);
    const session = this.buildInitialSession(profile, requestedLanguage);
    await this.store.set(session);
    await this.cache?.set(session);
    return session;
  }

  /**
   * 功能：只读获取会话（不触发创建），优先读取缓存 | Description: Read-only session fetch (no creation), prefers cache
   */
  async getSessionById(sessionId: string): Promise<SessionData | null> {
    const cached = await this.cache?.get(sessionId);
    if (cached) return cached;
    return this.store.get(sessionId);
  }

  /**
   * 功能：在会话中追加一轮消息，更新版本与时间戳
   * Description: Append a turn to session, update version and timestamps
   * @param {string} sessionId - 会话ID | Session ID
   * @param {Object} payload - 负载 | Payload
   * @param {ChatMessage} payload.userMessage - 用户消息（role=user） | User message
   * @param {ChatMessage} payload.assistantMessage - 助手消息（role=assistant） | Assistant message
   * @param {CharacterState} payload.characterState - 更新后的角色状态 | Updated state
   * @returns {Promise<SessionData>} 更新后的会话 | Updated session
   * @throws {Error} 当角色不匹配或会话不存在 | When roles mismatch or session missing
   */
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
    await this.cache?.set(updated);
    return updated;
  }

  /**
   * 功能：更新会话头像 URL，并提升版本
   * Description: Update session avatar URL and bump version
   * @param {string} sessionId - 会话ID | Session ID
   * @param {string} avatarUrl - 新头像地址 | New avatar URL
   * @returns {Promise<SessionData>} 更新后的会话 | Updated session
   */
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
    await this.cache?.set(updated);
    return updated;
  }

  /**
   * 功能：构建初始会话，包括默认问候与角色状态
   * Description: Build initial session with default greeting and state
   * @param {CharacterProfile} profile - 角色配置 | Character profile
   * @param {string} languageCode - 语言码 | Language code
   * @returns {SessionData} 新会话 | New session
   */
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
