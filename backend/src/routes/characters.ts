/**
 * 文件：backend/src/routes/characters.ts
 * 功能描述：角色列表与激活接口路由 | Description: Character listing and activation API routes
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 Fastify、Zod、角色与会话服务；被服务器注册
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AppContext } from '../container.js';

/**
 * 功能：注册角色相关路由 `/api/characters` 与 `/api/characters/:id/activate`
 * Description: Register character list and activation endpoints
 * @param {FastifyInstance} app - Fastify 应用实例 | Fastify app instance
 * @param {AppContext} ctx - 应用上下文 | App context
 * @returns {void} 无返回值 | No return value
 */
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

  // 业务规则：激活角色会创建/复用会话，并返回初始消息片段以便前端展示
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
