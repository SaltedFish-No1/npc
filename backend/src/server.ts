/**
 * 文件：backend/src/server.ts
 * 功能描述：构建并配置 Fastify 服务器（插件、全局鉴权、路由注册） | Description: Build and configure Fastify server with plugins, auth hook, and routes
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 Fastify、各路由注册方法及 AppConfig；被启动入口调用
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { FastifySSEPlugin } from 'fastify-sse-v2';
import type { FastifyInstance } from 'fastify';

import { AppConfig } from './config/env.js';
import { buildAppContext } from './container.js';
import { registerCharacterRoutes } from './routes/characters.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerImageRoutes } from './routes/images.js';
import { registerHealthRoute } from './routes/health.js';
import { registerSessionRoutes } from './routes/sessions.js';
import { registerMemoryRoutes } from './routes/memory.js';

const fastifyLoggerOptions =
  process.env.NODE_ENV === 'development'
    ? {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true
          }
        }
      }
    : { level: process.env.LOG_LEVEL ?? 'info' };

/**
 * 功能：创建并返回已注册插件与路由的 Fastify 应用实例
 * Description: Create and return Fastify instance with plugins, auth hook, and routes
 * @param {AppConfig} config - 配置对象（端口、鉴权KEY、速率等） | App configuration
 * @returns {Promise<FastifyInstance>} Fastify 应用实例 | Fastify app instance
 */
export const createServer = async (config: AppConfig): Promise<FastifyInstance> => {
  const app = Fastify({ logger: fastifyLoggerOptions });
  const ctx = buildAppContext(config);

  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });
  await app.register(FastifySSEPlugin);

  registerHealthRoute(app);

  // 业务关键逻辑：全局鉴权钩子
  // 中文：除健康检查外，所有请求必须携带 `x-api-key`，值需匹配 `NPC_GATEWAY_KEY`
  // English: Global auth hook requires `x-api-key` to equal `NPC_GATEWAY_KEY` for all non-health paths
  app.addHook('onRequest', async (request, reply) => {
    const path = request.routeOptions?.url ?? request.raw.url ?? '';
    if (path.startsWith('/health')) return;
    const token = request.headers['x-api-key'];
    if (token !== ctx.config.NPC_GATEWAY_KEY) {
      reply.code(401).send({ error: 'UNAUTHORIZED' });
      return reply;
    }
  });

  registerCharacterRoutes(app, ctx);
  registerChatRoutes(app, ctx);
  registerImageRoutes(app, ctx);
  registerSessionRoutes(app, ctx);
  registerMemoryRoutes(app);

  return app;
};
