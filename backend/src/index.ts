/**
 * 文件：backend/src/index.ts
 * 功能描述：后端服务启动入口，加载环境配置并创建/启动 Fastify 服务器 | Description: Backend bootstrap entry that loads config and creates/starts Fastify server
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 `config/env` 获取配置，依赖 `server` 创建服务，被进程主模块调用
 */
import { getConfig } from './config/env.js';
import { createServer } from './server.js';
import { logger } from './logger.js';

/**
 * 功能：启动后端服务，处理启动期间的错误并记录日志
 * Description: Boots the backend server and handles startup errors with logging
 * @returns {Promise<void>} 无返回值 | No return value
 */
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
