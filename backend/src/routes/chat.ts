/**
 * 文件：backend/src/routes/chat.ts
 * 功能描述：聊天接口路由，支持一次性响应与 SSE 流式响应 | Description: Chat API routes supporting single response and SSE streaming
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 Fastify、Zod、会话与聊天服务；被服务器注册
 */
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

/**
 * 功能：注册聊天相关路由 `/api/npc/chat` 与 `/api/npc/chat/stream`
 * Description: Register chat endpoints for non-stream and SSE streaming responses
 * @param {FastifyInstance} app - Fastify 应用实例 | Fastify app instance
 * @param {AppContext} ctx - 应用上下文（服务与配置） | App context
 * @returns {void} 无返回值 | No return value
 * @example
 * // 请求头需包含：x-api-key
 * // POST /api/npc/chat  Body: { sessionId|characterId, languageCode?, messages: [{role, content}] }
 * // POST /api/npc/chat/stream  同上，返回 SSE：event=chunk/final/end
 */
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

  // SSE 流式接口：逐块发送模型输出，最终发送聚合结果并结束
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

    // 非常规处理：显式设置 SSE 头避免缓存与错误解析 | Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');

    /**
     * 功能：向客户端发送单个文本块
     * Description: Emit a single text chunk to the SSE stream
     * @param {string} chunk - 文本片段 | Text fragment
     */
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

    // 结束事件：发送最终聚合结果与结束信号
    reply.sse({ event: 'final', data: JSON.stringify(finalPayload) });
    reply.sse({ event: 'end', data: '' });
    setImmediate(() => reply.raw.end());
    return reply;
    }
  );
};
