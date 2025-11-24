/**
 * 文件：backend/src/services/memory/memoryService.ts
 * 功能描述：长期记忆服务（条目持久化、嵌入生成与检索） | Description: Long-term memory service for persistence, embeddings and retrieval
 */
import type { AppConfig } from '../../config/env.js';
import type { DB } from '../../db/dbClient.js';
import { LLMClient } from '../../clients/llmClient.js';

export type MemoryEntry = {
  id: string;
  characterId: string;
  sessionId?: string;
  type: 'INSIGHT' | 'FACT' | 'TRAIT' | 'GOAL';
  content: string;
  importance: number; // 1-10
  createdAt: number;
};

export class MemoryService {
  constructor(private readonly config: AppConfig, private readonly db: DB, private readonly llm: LLMClient) {}

  async createEntry(entry: MemoryEntry): Promise<void> {
    await this.db.query(
      `INSERT INTO character_memory_stream (id, characterId, sessionId, type, content, importance, createdAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [entry.id, entry.characterId, entry.sessionId ?? null, entry.type, entry.content, entry.importance, entry.createdAt]
    );
  }

  async upsertEmbedding(id: string, content: string): Promise<void> {
    if (this.config.DB_TYPE !== 'postgres') throw new Error('Vector embeddings require Postgres + pgvector');
    const emb = await this.llm.createEmbedding(content);
    await this.db.query(
      `INSERT INTO character_memory_embeddings (id, embedding) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET embedding = EXCLUDED.embedding`,
      [id, emb]
    );
  }

  async searchByQuery(characterId: string, query: string): Promise<MemoryEntry[]> {
    if (this.config.DB_TYPE !== 'postgres') {
      throw new Error('Vector search requires Postgres + pgvector');
    }

    const qEmb = await this.llm.createEmbedding(query);
    const rows = await this.db.query<any>(
      `SELECT s.id, s.characterId, s.sessionId, s.type, s.content, s.importance, s.createdAt,
              (e.embedding <-> $2) AS distance
       FROM character_memory_stream s JOIN character_memory_embeddings e ON s.id = e.id
       WHERE s.characterId = $1
       ORDER BY e.embedding <-> $2 ASC
       LIMIT $3`,
      [characterId, qEmb, this.config.RAG_TOP_K]
    );
    // 过滤距离阈值
    const threshold = this.config.RAG_SCORE_THRESHOLD ?? 0.25;
    const filtered = (rows.rows || []).filter((r: any) => (r.distance ?? 0) <= threshold);
    return filtered as MemoryEntry[];
  }
}
