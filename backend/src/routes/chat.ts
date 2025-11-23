import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AppContext } from '../container.js';
import { ChatMessage } from '../schemas/chat.js';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string()
});

const chatBodySchema = z
  .object({
    sessionId: z.string().optional(),
    characterId: z.string().optional(),
    languageCode: z.string().optional(),
    messages: z.array(messageSchema).min(1),
    stream: z.boolean().optional()
  })
  .refine((data) => data.sessionId || data.characterId, {
    message: 'Either sessionId or characterId is required',
    path: ['characterId']
  });

type ChatBody = z.infer<typeof chatBodySchema>;

export const registerChatRoutes = (app: FastifyInstance, ctx: AppContext) => {
  app.post('/api/npc/chat', async (request: FastifyRequest<{ Body: ChatBody }>, reply: FastifyReply) => {
    const body = chatBodySchema.parse(request.body);
    const session = await ctx.services.sessions.getOrCreateSession({
      sessionId: body.sessionId,
      characterId: body.characterId,
      languageCode: body.languageCode
    });

    const incoming = body.messages.map<ChatMessage>((msg) => ({
      role: msg.role,
      content: msg.content
    }));

    const result = await ctx.services.chat.handleTurn({
      session,
      incomingMessages: incoming,
      stream: false
    });

    return reply.send({
      sessionId: result.session.sessionId,
      characterState: result.session.characterState,
      assistantMessage: result.assistantMessage,
      imagePrompt: result.ai.image_prompt,
      sessionVersion: result.session.version
    });
  });

  app.post(
    '/api/npc/chat/stream',
    async (request: FastifyRequest<{ Body: ChatBody }>, reply: FastifyReply) => {
    const body = chatBodySchema.parse(request.body);
    const session = await ctx.services.sessions.getOrCreateSession({
      sessionId: body.sessionId,
      characterId: body.characterId,
      languageCode: body.languageCode
    });

    const incoming = body.messages.map<ChatMessage>((msg) => ({
      role: msg.role,
      content: msg.content
    }));

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');

    const emitChunk = (chunk: string) => {
      reply.sse({ event: 'chunk', data: chunk });
    };

    const result = await ctx.services.chat.handleTurn({
      session,
      incomingMessages: incoming,
      stream: true,
      onChunk: emitChunk
    });

    const finalPayload = {
      sessionId: result.session.sessionId,
      characterState: result.session.characterState,
      assistantMessage: result.assistantMessage,
      imagePrompt: result.ai.image_prompt,
      sessionVersion: result.session.version
    };

    reply.sse({ event: 'final', data: JSON.stringify(finalPayload) });
    reply.sse({ event: 'end', data: '' });
    setImmediate(() => reply.raw.end());
    return reply;
    }
  );
};
