/**
 * 文件：backend/src/routes/sessions.ts
 * 功能描述：会话只读接口（单个会话信息与消息分页） | Description: Read-only session APIs
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AppContext } from '../container.js';

export const registerSessionRoutes = (app: FastifyInstance, ctx: AppContext) => {
  app.get('/api/npc/sessions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const session = await ctx.services.sessions.getSessionById(params.id);
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    // 仅返回元数据与最近 N 条消息（或空数组）
    const limit = 20;
    const messages = session.messages.slice(-limit);
    return reply.send({
      sessionId: session.sessionId,
      characterId: session.characterId,
      languageCode: session.languageCode,
      characterState: session.characterState,
      version: session.version,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages
    });
  });

  app.get('/api/npc/sessions/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({ limit: z.coerce.number().int().positive().max(200).default(50), offset: z.coerce.number().int().nonnegative().default(0) });
    const paramsSchema = z.object({ id: z.string() });
    const params = paramsSchema.parse(request.params);
    const { limit, offset } = querySchema.parse(request.query);
    const db = await (globalThis as any).__npc_db;
    const all = await db.query(
      'SELECT messageId, role, content, thought, attributes, createdAt FROM session_messages WHERE sessionId=$1 ORDER BY createdAt ASC',
      [params.id]
    );
    const total = all.rows.length;
    const slice = all.rows.slice(offset, offset + limit);
    const items = slice.map((m: any) => ({
      role: m.role,
      content: m.content,
      thought: m.thought ?? undefined,
      ...(typeof m.attributes === 'string' ? JSON.parse(m.attributes || '{}') : (m.attributes || {})),
      createdAt: m.createdat ?? m.createdAt
    }));
    return reply.send({ total, limit, offset, items });
  });
};
