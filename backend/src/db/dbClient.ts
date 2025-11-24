/**
 * 文件：backend/src/db/dbClient.ts
 * 功能描述：统一数据库客户端与表结构初始化（SQLite/Postgres） | Description: Unified DB client and schema init for SQLite/Postgres
 */
import type { AppConfig } from '../config/env.js';
import { logger } from '../logger.js';

type QueryResultRow = Record<string, unknown>;

export type DB = {
  query<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
  ping(): Promise<boolean>;
};

export const createDBClient = async (config: AppConfig): Promise<DB> => {
  if (config.DB_TYPE !== 'postgres') {
    throw new Error('DB_TYPE must be postgres when vector retrieval is required');
  }
  if (!config.DB_URL) {
    throw new Error('DB_URL is required for postgres connection');
  }
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: config.DB_URL, max: config.DB_POOL_SIZE });
  const client: DB = {
    query: async <T extends QueryResultRow>(sql: string, params: unknown[] = []) => {
      const res = await pool.query(sql, params as any[]);
      return { rows: res.rows as unknown as T[] };
    },
    exec: async (sql) => {
      await pool.query(sql);
    },
    ping: async () => {
      try {
        await pool.query('SELECT 1');
        return true;
      } catch (e) {
        logger.error({ e }, 'DB ping failed');
        return false;
      }
    }
  };
  await initSchema(client, config);
  return client;
};

const initSchema = async (db: DB, config: AppConfig) => {
  // sessions
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sessionId TEXT PRIMARY KEY,
      characterId TEXT NOT NULL,
      languageCode TEXT NOT NULL,
      characterState JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL
    );
  `);

  // session_messages
  await db.exec(`
    CREATE TABLE IF NOT EXISTS session_messages (
      messageId TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      thought TEXT NULL,
      attributes JSONB NULL,
      createdAt BIGINT NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(sessionId) ON DELETE CASCADE
    );
  `);

  // character_memory_stream
  await db.exec(`
    CREATE TABLE IF NOT EXISTS character_memory_stream (
      id TEXT PRIMARY KEY,
      characterId TEXT NOT NULL,
      sessionId TEXT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      importance INTEGER NOT NULL,
      createdAt BIGINT NOT NULL
    );
  `);

  await db.exec(`CREATE EXTENSION IF NOT EXISTS vector`);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS character_memory_embeddings (
      id TEXT PRIMARY KEY,
      embedding vector(${config.EMBEDDING_DIM})
    );
  `);
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_embeddings_hnsw ON character_memory_embeddings USING hnsw (embedding)`);
  } catch {}

  await db.exec(`
    CREATE TABLE IF NOT EXISTS character_avatars (
      id TEXT PRIMARY KEY,
      characterId TEXT NULL,
      statusLabel TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      metadata JSONB NULL,
      createdAt BIGINT NOT NULL
    );
  `);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_character_avatars_characterId ON character_avatars(characterId)`);
};
