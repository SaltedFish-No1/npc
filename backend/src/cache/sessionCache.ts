/**
 * 文件：backend/src/cache/sessionCache.ts
 * 功能描述：会话缓存（Redis 可选），用于加速读取与降低数据库压力 | Description: Optional Redis-backed session cache with TTL
 */
import type { AppConfig } from '../config/env.js';
import type { SessionData } from '../schemas/chat.js';
import { logger } from '../logger.js';

export interface SessionCache {
  get(sessionId: string): Promise<SessionData | null>;
  set(session: SessionData, ttlMs?: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
  touch(sessionId: string, ttlMs?: number): Promise<void>;
}

export const createSessionCache = async (config: AppConfig): Promise<SessionCache | null> => {
  if (!config.REDIS_URL) return null;
  const { default: IORedis } = await import('ioredis');
  const redis = new (IORedis as unknown as new (...args: any[]) => any)(config.REDIS_URL);
  const key = (id: string) => `session:${id}`;
  const toSec = (ms?: number) => Math.max(1, Math.floor((ms ?? 1000 * 60 * 60 * 2) / 1000));

  redis.on('error', (e: unknown) => logger.error({ e }, 'Redis error'));

  const impl: SessionCache = {
    async get(sessionId) {
      const raw = await redis.get(key(sessionId));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as SessionData;
      } catch {
        return null;
      }
    },
    async set(session, ttlMs) {
      await redis.set(key(session.sessionId), JSON.stringify(session), 'EX', toSec(ttlMs));
    },
    async delete(sessionId) {
      await redis.del(key(sessionId));
    },
    async touch(sessionId, ttlMs) {
      await redis.expire(key(sessionId), toSec(ttlMs));
    }
  };

  return impl;
};
