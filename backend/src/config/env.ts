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

  const resolved: AppConfig = {
    ...parsed.data,
    NPC_GATEWAY_KEY: parsed.data.NPC_GATEWAY_KEY ?? parsed.data.LLM_API_AUTH_TOKEN
  };

  cached = resolved;
  return cached;
};
