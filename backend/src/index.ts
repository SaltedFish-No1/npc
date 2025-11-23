import { getConfig } from './config/env.js';
import { createServer } from './server.js';
import { logger } from './logger.js';

const bootstrap = async () => {
  try {
    const config = getConfig();
    const server = await createServer(config);
    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info(`Headless NPC backend listening on ${config.PORT}`);
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
};

bootstrap();
