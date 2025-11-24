import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AppContext } from '../container.js';

const listQuerySchema = z.object({
  characterId: z.string().optional(),
  includeGlobal: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return true;
    })
    .default(true)
});

const selectBodySchema = z.object({
  avatarId: z.string()
});

export const registerAvatarRoutes = (app: FastifyInstance, ctx: AppContext) => {
  app.get('/api/npc/avatars', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listQuerySchema.parse(request.query);
    const avatars = await ctx.services.avatars.listAvatars({
      characterId: query.characterId,
      includeGlobal: query.includeGlobal
    });
    return reply.send(avatars);
  });

  app.post(
    '/api/npc/sessions/:id/avatar',
    async (request: FastifyRequest<{ Params: { id: string }; Body: { avatarId: string } }>, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const params = paramsSchema.parse(request.params);
      const body = selectBodySchema.parse(request.body);
      const avatar = await ctx.services.avatars.getAvatarOrThrow(body.avatarId);
      const session = await ctx.services.sessions.updateAvatar(params.id, {
        avatarId: avatar.id,
        imageUrl: avatar.imageUrl,
        statusLabel: avatar.statusLabel
      });
      return reply.send({
        sessionId: session.sessionId,
        characterState: session.characterState,
        sessionVersion: session.version
      });
    }
  );
};
