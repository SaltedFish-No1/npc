import { SessionData } from '../../schemas/chat.js';

import { SessionStore } from './sessionStore.js';

type Entry = { data: SessionData; expiresAt: number };

export class InMemorySessionStore implements SessionStore {
  private readonly store = new Map<string, Entry>();

  constructor(private readonly ttlMs: number) {}

  async get(sessionId: string): Promise<SessionData | null> {
    const entry = this.store.get(sessionId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(sessionId);
      return null;
    }
    return entry.data;
  }

  async set(session: SessionData): Promise<void> {
    this.store.set(session.sessionId, { data: session, expiresAt: Date.now() + this.ttlMs });
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }

  async touch(sessionId: string): Promise<void> {
    const entry = this.store.get(sessionId);
    if (!entry) return;
    entry.expiresAt = Date.now() + this.ttlMs;
  }
}
