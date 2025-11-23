import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AppContext } from '../container.js';

const imageBodySchema = z
  .object({
    sessionId: z.string().optional(),
    characterId: z.string().optional(),
    prompt: z.string().optional(),
    ratio: z.enum(['1:1', '16:9', '4:3']).optional(),
    useImagePrompt: z.boolean().optional(),
    updateAvatar: z.boolean().optional()
  })
  .refine((data) => data.sessionId || data.characterId, {
    message: 'Either sessionId or characterId is required',
    path: ['characterId']
  });

type ImageBody = z.infer<typeof imageBodySchema>;

export const registerImageRoutes = (app: FastifyInstance, ctx: AppContext) => {
  app.post(
    '/api/npc/images',
    async (request: FastifyRequest<{ Body: ImageBody }>, reply: FastifyReply) => {
      const body = imageBodySchema.parse(request.body);
      const session = await ctx.services.sessions.getOrCreateSession({
        sessionId: body.sessionId,
        characterId: body.characterId
      });

      const result = await ctx.services.image.handleGeneration({
        session,
        prompt: body.prompt,
        ratio: body.ratio,
        useImagePrompt: body.useImagePrompt,
        updateAvatar: body.updateAvatar
      });

      return reply.send({
        sessionId: result.session.sessionId,
        imageUrl: result.imageUrl,
        characterState: result.session.characterState,
        sessionVersion: result.session.version
      });
    }
  );
};
