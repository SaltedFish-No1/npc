/**
 * 文件：backend/src/routes/sessions.ts
 * 功能描述：会话只读接口（单个会话信息与消息分页） | Description: Read-only session APIs
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AppContext } from '../container.js';
import { digitalPersonaRuntimePatchSchema } from '../schemas/persona.js';

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
      personaId: session.personaId,
      personaRuntime: session.personaRuntime,
      version: session.version,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages
    });
  });

  app.get('/api/npc/sessions/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({
      limit: z.coerce.number().int().positive().max(200).default(50),
      cursor: z.string().optional()
    });
    const paramsSchema = z.object({ id: z.string() });
    const params = paramsSchema.parse(request.params);
    const { limit, cursor } = querySchema.parse(request.query);
    const result = await ctx.services.sessions.listMessages({
      sessionId: params.id,
      limit,
      cursor: cursor || undefined
    });
    return reply.send(result);
  });

  app.get('/api/npc/sessions/:id/persona', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const session = await ctx.services.sessions.getSessionById(params.id);
    if (!session || !session.personaId) {
      return reply.code(404).send({ error: 'PERSONA_NOT_FOUND' });
    }
    return reply.send({
      sessionId: session.sessionId,
      personaId: session.personaId,
      personaRuntime: session.personaRuntime
    });
  });

  app.patch('/api/npc/sessions/:id/persona', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = digitalPersonaRuntimePatchSchema.parse(request.body ?? {});
    const updated = await ctx.services.sessions.updatePersonaRuntimeState(params.id, body);
    return reply.send({
      sessionId: updated.sessionId,
      personaId: updated.personaId,
      personaRuntime: updated.personaRuntime,
      version: updated.version,
      updatedAt: updated.updatedAt
    });
  });
};
