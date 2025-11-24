/**
 * 文件：backend/src/config/env.ts
 * 功能描述：加载并校验环境变量，提供应用配置（含鉴权KEY合并规则） | Description: Load and validate environment variables, providing app config with auth key resolution
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 dotenv 与 zod；被启动流程与服务使用
 */
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LLM_API_AUTH_TOKEN: z.string().min(1, 'LLM_API_AUTH_TOKEN is required'),
  NPC_GATEWAY_KEY: z.string().optional(),
  LLM_API_BASE: z.string().url(),
  LLM_API_KEY: z.string().min(1, 'LLM_API_KEY is required'),
  TEXT_MODEL_NAME: z.string().min(1),
  IMG_MODEL_NAME: z.string().min(1),
  SESSION_STORE: z.enum(['memory', 'redis']).default('memory'),
  MOCK_LLM_RESPONSES: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      return val === 'true';
    })
    .default(false)
});

type RawAppConfig = z.infer<typeof envSchema>;
export type AppConfig = RawAppConfig & { NPC_GATEWAY_KEY: string };

let cached: AppConfig | null = null;

/**
 * 功能：读取并缓存应用配置；将 `NPC_GATEWAY_KEY` 为空时回退为 `LLM_API_AUTH_TOKEN`
 * Description: Read and cache app configuration; fallback `NPC_GATEWAY_KEY` to `LLM_API_AUTH_TOKEN` when missing
 * @returns {AppConfig} 应用配置对象 | Application configuration object
 */
export const getConfig = (): AppConfig => {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    LLM_API_AUTH_TOKEN: process.env.LLM_API_AUTH_TOKEN,
    NPC_GATEWAY_KEY: process.env.NPC_GATEWAY_KEY,
    LLM_API_BASE: process.env.LLM_API_BASE,
    LLM_API_KEY: process.env.LLM_API_KEY,
    TEXT_MODEL_NAME: process.env.TEXT_MODEL_NAME,
    IMG_MODEL_NAME: process.env.IMG_MODEL_NAME,
    SESSION_STORE: process.env.SESSION_STORE,
    MOCK_LLM_RESPONSES: process.env.MOCK_LLM_RESPONSES
  });

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  // 业务关键逻辑：鉴权KEY合并
  // 中文：若未显式提供 `NPC_GATEWAY_KEY`，使用 `LLM_API_AUTH_TOKEN` 以保持网关与上游一致
  // English: If `NPC_GATEWAY_KEY` is not set, reuse `LLM_API_AUTH_TOKEN` to align gateway and upstream
  const resolved: AppConfig = {
    ...parsed.data,
    NPC_GATEWAY_KEY: parsed.data.NPC_GATEWAY_KEY ?? parsed.data.LLM_API_AUTH_TOKEN
  };

  cached = resolved;
  return cached;
};
