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
import { AvatarService } from '../avatars/avatarService.js';
import type { DB } from '../../db/dbClient.js';

const DEFAULT_LANGUAGE = 'en';

/**
 * 会话服务：封装会话相关操作与业务规则
 * SessionService: Encapsulates session operations and business rules
 */
export class SessionService {
  constructor(
    private readonly store: SessionStore,
    private readonly characterService: CharacterService,
    private readonly cache?: SessionCache | null,
    private readonly avatarService?: AvatarService,
    private readonly dbPromise?: Promise<DB> | null
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
    // Resolve cache promise once at the beginning for all code paths
    const cacheInstance = await this.cache;

    if (params.sessionId) {
      const cached = await cacheInstance?.get(params.sessionId);
      const existing = cached ?? (await this.store.get(params.sessionId));
      if (existing) {
        // 业务关键逻辑：语言切换时，删除旧会话并重建，避免跨语言历史污染
        if (existing.languageCode !== requestedLanguage) {
          await this.store.delete(existing.sessionId);
          await cacheInstance?.delete(existing.sessionId);
        } else {
          await this.store.touch(existing.sessionId);
          await cacheInstance?.touch(existing.sessionId);
          return this.hydrateAvatarFromLibrary(existing, cacheInstance);
        }
      }
    }

    if (!params.characterId) {
      throw new Error('characterId is required when creating a new session');
    }

    const profile = this.characterService.getCharacterOrThrow(params.characterId);
    const session = this.buildInitialSession(profile, requestedLanguage);
    await this.store.set(session);
    await cacheInstance?.set(session);
    return this.hydrateAvatarFromLibrary(session, cacheInstance);
  }

  /**
   * 功能：只读获取会话（不触发创建），优先读取缓存 | Description: Read-only session fetch (no creation), prefers cache
   */
  async getSessionById(sessionId: string): Promise<SessionData | null> {
    const cacheInstance = await this.cache;
    const cached = await cacheInstance?.get(sessionId);
    if (cached) {
      return this.hydrateAvatarFromLibrary(cached, cacheInstance);
    }
    const stored = await this.store.get(sessionId);
    if (!stored) return null;
    return this.hydrateAvatarFromLibrary(stored, cacheInstance);
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

    const timestamp = Date.now();
    const userMessage: ChatMessage = {
      ...payload.userMessage,
      messageId: payload.userMessage.messageId ?? nanoid(),
      createdAt: payload.userMessage.createdAt ?? timestamp - 1
    };
    const assistantMessage: ChatMessage = {
      ...payload.assistantMessage,
      messageId: payload.assistantMessage.messageId ?? nanoid(),
      createdAt: payload.assistantMessage.createdAt ?? timestamp
    };

    const updated: SessionData = {
      ...existing,
      updatedAt: Date.now(),
      version: existing.version + 1,
      characterState: payload.characterState,
      messages: [...existing.messages, userMessage, assistantMessage]
    };

    // Resolve cache promise if it exists for update operations
    const cacheInstance = await this.cache;
    await this.store.set(updated);
    await cacheInstance?.set(updated);
    return updated;
  }

  /**
   * 功能：更新会话头像 URL，并提升版本
   * Description: Update session avatar URL and bump version
   * @param {string} sessionId - 会话ID | Session ID
   * @param {string} avatarUrl - 新头像地址 | New avatar URL
   * @returns {Promise<SessionData>} 更新后的会话 | Updated session
   */
  async updateAvatar(
    sessionId: string,
    avatar: { avatarId?: string; imageUrl: string; statusLabel?: string }
  ): Promise<SessionData> {
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
        avatarUrl: avatar.imageUrl,
        avatarId: avatar.avatarId,
        avatarLabel: avatar.statusLabel ?? existing.characterState.avatarLabel
      }
    };
    // Resolve cache promise if it exists for update operations
    const cacheInstance = await this.cache;
    await this.store.set(updated);
    await cacheInstance?.set(updated);
    return updated;
  }

  async attachImageToLastAssistantMessage(
    sessionId: string,
    payload: { imageUrl: string; imagePrompt?: string }
  ): Promise<SessionData> {
    const existing = await this.store.get(sessionId);
    if (!existing) {
      throw new Error('Session not found');
    }

    const messages = [...existing.messages];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role !== 'assistant') continue;
      messages[i] = {
        ...messages[i],
        imageUrl: payload.imageUrl,
        imagePrompt: payload.imagePrompt ?? messages[i].imagePrompt
      };
      const updated: SessionData = {
        ...existing,
        messages,
        updatedAt: Date.now()
      };
      const cacheInstance = await this.cache;
      await this.store.set(updated);
      await cacheInstance?.set(updated);
      return updated;
    }
    return existing;
  }

  async listMessages(params: {
    sessionId: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ChatMessage[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const db = await this.getDb();
    if (!db) {
      const session = await this.store.get(params.sessionId);
      if (!session) return { items: [], nextCursor: null };
      const ordered = [...session.messages].sort(
        (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)
      );
      const filtered = params.cursor
        ? ordered.filter((msg) => isMessageOlderThan(msg, params.cursor ?? '0:'))
        : ordered;
      const slice = filtered.slice(-limit);
      const nextCursor = filtered.length > slice.length && slice.length
        ? buildCursor(slice[0])
        : null;
      return { items: slice, nextCursor };
    }

    const cursor = params.cursor ? parseCursor(params.cursor) : null;
    const values: unknown[] = [params.sessionId];
    let where = 'WHERE sessionId=$1';
    if (cursor) {
      values.push(cursor.createdAt, cursor.messageId);
      where += ` AND (createdAt < $2 OR (createdAt = $2 AND messageId < $3))`;
    }
    values.push(limit + 1);
    const res = await db.query<{
      messageid: string;
      role: string;
      content: string;
      thought: string | null;
      attributes: string | null;
      createdat: number;
    }>(
      `SELECT messageId, role, content, thought, attributes, createdAt
       FROM session_messages
       ${where}
       ORDER BY createdAt DESC, messageId DESC
       LIMIT $${values.length}`,
      values
    );

    const rows = res.rows.slice();
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const extra = rows.pop()!;
      nextCursor = buildCursor({
        messageId: (extra as any).messageid ?? (extra as any).messageId,
        createdAt: (extra as any).createdat ?? (extra as any).createdAt
      });
    }

    const items = rows.map((row) => adaptMessageRow(row)).reverse();

    return { items, nextCursor };
  }

  private async getDb(): Promise<DB | null> {
    if (!this.dbPromise) return null;
    try {
      return await this.dbPromise;
    } catch {
      return null;
    }
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
      currentStress: profile.defaultState.stress,
      messageId: nanoid(),
      createdAt: Date.now()
    };

    const baseState = { ...profile.defaultState, name: profile.name };
    const mode = baseState.mode ?? 'NORMAL';
    const avatarLabel = baseState.avatarLabel ?? mode.toLowerCase();

    return {
      sessionId,
      characterId: profile.id,
      languageCode: normalizedLang,
      createdAt: initialAssistant.createdAt ?? Date.now(),
      updatedAt: initialAssistant.createdAt ?? Date.now(),
      version: 1,
      characterState: {
        ...baseState,
        mode,
        avatarLabel
      },
      messages: [initialAssistant]
    };
  }

  private async hydrateAvatarFromLibrary(
    session: SessionData,
    cacheInstance?: SessionCache | null
  ): Promise<SessionData> {
    if (!this.avatarService) return session;
    const current = session.characterState;
    if (current.avatarId) return session;

    const labelCandidates = [current.avatarLabel, current.mode?.toLowerCase()].filter(
      (label): label is string => Boolean(label)
    );

    let avatar = null;
    for (const label of labelCandidates) {
      avatar = await this.avatarService.findLatestAvatarByLabel(session.characterId, label);
      if (avatar) break;
    }
    if (!avatar) {
      avatar = await this.avatarService.findLatestAvatar(session.characterId);
    }
    if (!avatar) {
      return session;
    }
    if (current.avatarId === avatar.id) {
      return session;
    }

    const updated: SessionData = {
      ...session,
      characterState: {
        ...current,
        avatarId: avatar.id,
        avatarLabel: avatar.statusLabel,
        avatarUrl: avatar.imageUrl
      }
    };
    await this.store.set(updated);
    await cacheInstance?.set(updated);
    return updated;
  }
}

const parseCursor = (cursor: string): { createdAt: number; messageId: string } => {
  const [ts, ...rest] = cursor.split(':');
  return {
    createdAt: Number(ts) || 0,
    messageId: rest.join(':') ?? ''
  };
};

const buildCursor = (input?: { createdAt?: number; messageId?: string } | null): string => {
  if (!input) return '0:';
  return `${input.createdAt ?? 0}:${input.messageId ?? ''}`;
};

const isMessageOlderThan = (msg: ChatMessage, cursor: string): boolean => {
  const target = parseCursor(cursor);
  const createdAt = msg.createdAt ?? 0;
  if (createdAt < target.createdAt) return true;
  if (createdAt > target.createdAt) return false;
  const messageId = msg.messageId ?? '';
  return messageId < target.messageId;
};

type StoredAttributes = Partial<Pick<ChatMessage, 'imageUrl'>>;

const adaptMessageRow = (row: {
  messageid?: string;
  messageId?: string;
  role: string;
  content: string;
  thought: string | null;
  attributes: string | null;
  createdat?: number;
  createdAt?: number;
}): ChatMessage => {
  const attrs = parseAttributesPayload(row.attributes);
  return {
    role: row.role as 'system' | 'user' | 'assistant',
    content: row.content,
    thought: row.thought ?? undefined,
    ...attrs,
    messageId: row.messageid ?? row.messageId,
    createdAt: row.createdat ?? row.createdAt
  };
};

const parseAttributesPayload = (val: string | null): StoredAttributes => {
  if (!val) return {};
  try {
    const parsed = JSON.parse(val);
    const output: StoredAttributes = {};
    if (typeof parsed.imageUrl === 'string') {
      output.imageUrl = parsed.imageUrl;
    }
    return output;
  } catch {
    return {};
  }
};
