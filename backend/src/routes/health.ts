/**
 * 文件：backend/src/routes/health.ts
 * 功能描述：健康检查路由 | Description: Health check route
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 Fastify；被服务器注册，免鉴权
 */
import type { FastifyInstance } from 'fastify';

/**
 * 功能：注册健康检查 `/health`（免鉴权）
 * Description: Register unauthenticated health endpoint
 * @param {FastifyInstance} app - Fastify 应用实例 | Fastify app instance
 * @returns {void} 无返回值 | No return value
 */
export const registerHealthRoute = (app: FastifyInstance) => {
  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));
};
