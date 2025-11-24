/**
 * 文件：backend/src/routes/memory.ts
 * 功能描述：角色长期记忆流只读接口 | Description: Read-only memory stream API
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

export const registerMemoryRoutes = (app: FastifyInstance) => {
  app.get('/api/npc/memory-stream', async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({
      characterId: z.string().optional(),
      sessionId: z.string().optional(),
      limit: z.coerce.number().int().positive().max(200).default(50),
      offset: z.coerce.number().int().nonnegative().default(0)
    });
    const { characterId, sessionId, limit, offset } = querySchema.parse(request.query);
    const db = await (globalThis as any).__npc_db;
    const filters: string[] = [];
    const params: unknown[] = [];
    if (characterId) { filters.push('characterId=$' + (params.length + 1)); params.push(characterId); }
    if (sessionId) { filters.push('sessionId=$' + (params.length + 1)); params.push(sessionId); }
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const all = await db.query(`SELECT id, characterId, sessionId, type, content, importance, createdAt FROM character_memory_stream ${where} ORDER BY createdAt DESC`, params);
    const total = all.rows.length;
    const items = all.rows.slice(offset, offset + limit);
    return reply.send({ total, limit, offset, items });
  });
};

