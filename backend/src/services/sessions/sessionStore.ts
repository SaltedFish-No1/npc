import { SessionData } from '../../schemas/chat.js';

export interface SessionStore {
  get(sessionId: string): Promise<SessionData | null>;
  set(session: SessionData): Promise<void>;
  delete(sessionId: string): Promise<void>;
  touch(sessionId: string): Promise<void>;
}
