/**
 * 文件：backend/src/routes/images.ts
 * 功能描述：图片生成接口路由，支持使用提示词或会话中的 image_prompt | Description: Image generation API route using prompt or session image_prompt
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 Fastify、Zod、图片与会话服务；被服务器注册
 */
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

/**
 * 功能：注册图片生成路由 `/api/npc/images`
 * Description: Register image generation endpoint
 * @param {FastifyInstance} app - Fastify 应用实例 | Fastify app instance
 * @param {AppContext} ctx - 应用上下文 | App context
 * @returns {void} 无返回值 | No return value
 * @example
 * // 请求头需包含：x-api-key
 * // POST /api/npc/images  Body: { sessionId|characterId, prompt?, ratio?, useImagePrompt?, updateAvatar? }
 */
export const registerImageRoutes = (app: FastifyInstance, ctx: AppContext) => {
  app.post(
    '/api/npc/images',
    async (request: FastifyRequest<{ Body: ImageBody }>, reply: FastifyReply) => {
      const body = imageBodySchema.parse(request.body);
      const session = await ctx.services.sessions.getOrCreateSession({
        sessionId: body.sessionId,
        characterId: body.characterId
      });

      // 业务关键逻辑：当 `useImagePrompt` 为真时，优先使用会话中 AI 生成的 image_prompt
      // English: If `useImagePrompt` is true, prefer session's AI-generated image_prompt
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
