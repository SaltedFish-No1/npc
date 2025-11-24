/**
 * 文件：backend/src/logger.ts
 * 功能描述：Pino 日志器配置（开发态美化，生产态标准输出） | Description: Configure Pino logger with pretty transport in dev and std output in prod
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 pino；被启动与服务模块使用
 */
import pino from 'pino';

/**
 * 功能：提供全局可用的 Pino 日志实例
 * Description: Expose a global Pino logger instance
 * @returns {pino.Logger} 日志实例 | Pino logger instance
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true
          }
        }
      : undefined
});
