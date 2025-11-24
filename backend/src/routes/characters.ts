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
import { buildPersonaRuntimeHighlights } from '../utils/personaHighlights.js';

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
    const characters = ctx.services.characters.listCharacters(query.languageCode);
    const filtered = query.languageCode
      ? characters.filter((char) => matchesLanguagePreference(char.languages, query.languageCode))
      : characters;
    return reply.send(filtered);
  });

  /**
   * 业务规则：激活角色会创建/复用会话，并返回初始消息片段以便前端展示。
   * Response 字段说明：
   * - sessionId/characterId/languageCode：用于后续聊天请求
   * - characterState：最新的 stress/trust 等数值
   * - personaId/personaRuntime：DigitalPersona 运行态快照，前端可直接渲染心智面板
   * - initialMessages：最近 3 条对话，方便 UI 在加载时立即展示
   */
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
      // 初始化就返回 persona 运行态，便于前端立即展示 DigitalPersona 数据
      personaId: session.personaId,
      personaRuntime: session.personaRuntime,
      personaHighlights: buildPersonaRuntimeHighlights(session.personaRuntime),
      initialMessages: session.messages.slice(-3)
    });
  });
};

/**
 * 功能：判断角色语言配置是否满足请求语言，支持 `zh` 匹配 `zh-cn`
 * Description: Determine if character languages satisfy the requested language, allowing base-code fallback
 * @param {string[]} characterLanguages - 角色支持的语言列表 | Supported languages on the character profile
 * @param {string} [requested] - 请求语言码，可为 `xx` 或 `xx-YY`
 * @returns {boolean} 是否匹配 | Whether the language requirement is satisfied
 */
const matchesLanguagePreference = (characterLanguages: string[], requested?: string) => {
  if (!requested) return true;
  const requestedNorm = requested.toLowerCase();
  const requestedBase = requestedNorm.split('-')[0];
  return characterLanguages.some((code) => {
    const normalized = code.toLowerCase();
    if (normalized === requestedNorm) return true;
    return normalized.split('-')[0] === requestedBase;
  });
};
