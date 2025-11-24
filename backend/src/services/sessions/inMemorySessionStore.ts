/**
 * 文件：backend/src/services/sessions/inMemorySessionStore.ts
 * 功能描述：内存会话存储，带 TTL 自动过期机制 | Description: In-memory session store with TTL-based expiry
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：实现 SessionStore 接口；被会话服务使用
 */
import { SessionData } from '../../schemas/chat.js';

import { SessionStore } from './sessionStore.js';

type Entry = { data: SessionData; expiresAt: number };

/**
 * 内存存储实现：在读取时检查过期并清理
 * In-memory store: checks expiry on read and purges
 */
export class InMemorySessionStore implements SessionStore {
  private readonly store = new Map<string, Entry>();

  /**
   * @param {number} ttlMs - 过期时间毫秒数 | TTL in milliseconds
   */
  constructor(private readonly ttlMs: number) {}

  /**
   * 读取会话，若过期则删除并返回 null
   * Get a session; if expired, delete and return null
   */
  async get(sessionId: string): Promise<SessionData | null> {
    const entry = this.store.get(sessionId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(sessionId);
      return null;
    }
    return entry.data;
  }

  /**
   * 写入会话并刷新过期时间
   * Set a session and refresh expiry
   */
  async set(session: SessionData): Promise<void> {
    this.store.set(session.sessionId, { data: session, expiresAt: Date.now() + this.ttlMs });
  }

  /**
   * 删除会话
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }

  /**
   * 刷新会话过期时间
   * Refresh session TTL
   */
  async touch(sessionId: string): Promise<void> {
    const entry = this.store.get(sessionId);
    if (!entry) return;
    entry.expiresAt = Date.now() + this.ttlMs;
  }
}
