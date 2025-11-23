import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AppContext } from '../container.js';

export const registerCharacterRoutes = (app: FastifyInstance, ctx: AppContext) => {
  app.get('/api/characters', async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({ languageCode: z.string().optional() });
    const query = querySchema.parse(request.query);
    const characters = ctx.services.characters.listCharacters();
    const filtered = query.languageCode
      ? characters.filter((char) => char.languages.includes(query.languageCode!))
      : characters;
    return reply.send(filtered);
  });

  app.post('/api/characters/:id/activate', async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({ id: z.string() });
    const bodySchema = z.object({
      sessionId: z.string().optional(),
      languageCode: z.string().optional()
    });

    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    const session = await ctx.services.sessions.getOrCreateSession({
      sessionId: body.sessionId,
      characterId: params.id,
      languageCode: body.languageCode
    });

    const profile = ctx.services.characters.getCharacterOrThrow(params.id);

    return reply.send({
      sessionId: session.sessionId,
      characterId: session.characterId,
      languageCode: session.languageCode,
      characterState: session.characterState,
      initialMessages: session.messages.slice(-3)
    });
  });
};
