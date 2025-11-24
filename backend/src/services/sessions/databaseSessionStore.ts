/**
 * 文件：backend/src/services/sessions/databaseSessionStore.ts
 * 功能描述：基于数据库的会话存储（替代内存），完整持久化会话元数据与消息历史 | Description: Database-backed session store persisting session metadata and message history
 */
import { SessionData, ChatMessage, CharacterState } from '../../schemas/chat.js';
import { nanoid } from 'nanoid';
import type { SessionStore } from './sessionStore.js';
import type { DB } from '../../db/dbClient.js';
import type { DigitalPersonaRuntimeState } from '../../schemas/persona.js';

export class DatabaseSessionStore implements SessionStore {
  constructor(private readonly db: DB) {}

  async get(sessionId: string): Promise<SessionData | null> {
    const s = await this.db.query<{
      sessionid: string;
      characterid: string;
      languagecode: string;
      characterstate: string | Record<string, unknown>;
      version: number;
      createdat: number | string;
      updatedat: number | string;
    }>(
      'SELECT sessionId, characterId, languageCode, characterState, version, createdAt, updatedAt FROM sessions WHERE sessionId=$1',
      [sessionId]
    );
    if (s.rows.length === 0) return null;
    const row = s.rows[0];
    const msgs = await this.db.query<{
      messageid?: string;
      messageId?: string;
      role: string;
      content: string;
      thought: string | null;
      attributes: string | Record<string, unknown> | null;
      createdat?: number | string;
      createdAt?: number | string;
    }>(
      'SELECT messageId, role, content, thought, attributes, createdAt FROM session_messages WHERE sessionId=$1 ORDER BY createdAt ASC',
      [sessionId]
    );
    const messages: ChatMessage[] = msgs.rows.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
      thought: m.thought ?? undefined,
      ...(parseAttributes(m.attributes)),
      messageId: m.messageid ?? m.messageId ?? nanoid(),
      createdAt: Number(m.createdat ?? m.createdAt ?? Date.now())
    }));

    const rawState = parseJson(row.characterstate);
    const { __personaRuntime, __personaId, ...restState } = rawState;
    const characterState = restState as CharacterState;
    const personaRuntime = (__personaRuntime as DigitalPersonaRuntimeState | undefined) ?? undefined;
    const personaId = typeof __personaId === 'string' ? __personaId : undefined;

    return {
      sessionId: row.sessionid as unknown as string,
      characterId: row.characterid as unknown as string,
      languageCode: row.languagecode as unknown as string,
      characterState: characterState,
      personaRuntime,
      personaId,
      messages,
      version: row.version,
      createdAt: Number(row.createdat),
      updatedAt: Number(row.updatedat)
    };
  }

  async set(session: SessionData): Promise<void> {
    const now = Date.now();
    const statePayload: Record<string, unknown> = {
      ...(session.characterState as unknown as Record<string, unknown>)
    };
    if (session.personaRuntime) {
      statePayload.__personaRuntime = session.personaRuntime;
    }
    if (session.personaId) {
      statePayload.__personaId = session.personaId;
    }

    await this.db.query(
      `INSERT INTO sessions (sessionId, characterId, languageCode, characterState, version, createdAt, updatedAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (sessionId) DO UPDATE SET characterId=EXCLUDED.characterId, languageCode=EXCLUDED.languageCode, characterState=EXCLUDED.characterState, version=EXCLUDED.version, updatedAt=EXCLUDED.updatedAt`,
      [
        session.sessionId,
        session.characterId,
        session.languageCode,
        JSON.stringify(statePayload),
        session.version ?? 1,
        session.createdAt ?? now,
        now
      ]
    );

    // 简化策略：替换该会话全部消息（避免复杂 diff）
    await this.db.query('DELETE FROM session_messages WHERE sessionId=$1', [session.sessionId]);
    for (const m of session.messages) {
      const messageId = m.messageId ?? nanoid();
      const createdAt = m.createdAt ?? now;
      await this.db.query(
        `INSERT INTO session_messages (messageId, sessionId, role, content, thought, attributes, createdAt)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          messageId,
          session.sessionId,
          m.role,
          m.content,
          m.thought ?? null,
          JSON.stringify(serializeAttributes(m)),
          createdAt
        ]
      );
    }
  }

  async delete(sessionId: string): Promise<void> {
    await this.db.query('DELETE FROM session_messages WHERE sessionId=$1', [sessionId]);
    await this.db.query('DELETE FROM sessions WHERE sessionId=$1', [sessionId]);
  }

  async touch(sessionId: string): Promise<void> {
    const now = Date.now();
    await this.db.query('UPDATE sessions SET updatedAt=$2 WHERE sessionId=$1', [sessionId, now]);
  }
}

const parseJson = (val: unknown): Record<string, any> => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return {};
    }
  }
  if (val && typeof val === 'object') {
    return { ...(val as Record<string, unknown>) };
  }
  return {};
};

const serializeAttributes = (m: ChatMessage) => ({
  stressChange: m.stressChange,
  trustChange: m.trustChange,
  currentStress: m.currentStress,
  imageUrl: (m as any).imageUrl,
  imagePrompt: m.imagePrompt
});

const parseAttributes = (val: unknown) => {
  const obj = parseJson(val);
  const out: Record<string, unknown> = {};
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined && v !== null) out[k] = v;
    }
  }
  return out;
};

