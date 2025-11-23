import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sse from 'fastify-sse-v2';
import type { FastifyInstance } from 'fastify';

import { AppConfig } from './config/env.js';
import { buildAppContext } from './container.js';
import { registerCharacterRoutes } from './routes/characters.js';
import { registerChatRoutes } from './routes/chat.js';
import { registerImageRoutes } from './routes/images.js';
import { registerHealthRoute } from './routes/health.js';

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

export const createServer = async (config: AppConfig): Promise<FastifyInstance> => {
  const app = Fastify({ logger: fastifyLoggerOptions });
  const ctx = buildAppContext(config);

  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });
  await app.register(sse);

  registerHealthRoute(app);

  app.addHook('onRequest', async (request, reply) => {
    const path = request.routerPath ?? request.raw.url ?? '';
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

  return app;
};
