import type { FastifyInstance } from 'fastify';

export const registerHealthRoute = (app: FastifyInstance) => {
  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));
};
