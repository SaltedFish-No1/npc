/**
 * 文件：web/src/schemas/chat.ts
 * 功能描述：前端 Zod 模型定义（角色状态、消息、会话、回合响应、图片生成响应） | Description: Frontend Zod schemas for state, message, session, turn response, image generation response
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 zod 与角色配置
 */
import { z } from 'zod';
import { CHARACTER_PROFILE } from '@/config/characterProfile';
import { unifiedCharacterModelSchema } from '@/schemas/character';
import { digitalPersonaRuntimeStateSchema, personaRuntimeHighlightsSchema } from '@/schemas/persona';

/** 角色状态 | Character state */
export const characterStateSchema = z.object({
  stress: z.number().min(0).max(100).default(0),
  trust: z.number().min(-100).max(100).default(50),
  mode: z.string().default('NORMAL'),
  name: z.string().default(CHARACTER_PROFILE.defaultName),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  avatarId: z.string().optional(),
  avatarLabel: z.string().optional()
});

export type CharacterState = z.infer<typeof characterStateSchema>;

const optionalNormalizedCharacterStateSchema = characterStateSchema
  .optional()
  .transform((value) => (value ? characterStateSchema.parse(value) : undefined));

/** 聊天消息 | Chat message */
export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  thought: z.string().optional(),
  stressChange: z.number().optional(),
  trustChange: z.number().optional(),
  currentStress: z.number().optional(),
  imageUrl: z.string().url().optional(),
  imagePrompt: z.string().optional(),
  messageId: z.string().optional(),
  createdAt: z.number().optional()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** 会话数据 | Session data */
export const sessionSchema = z.object({
  sessionId: z.string(),
  characterId: z.string(),
  languageCode: z.string(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  version: z.number().optional(),
  characterState: characterStateSchema,
  characterModel: unifiedCharacterModelSchema.optional(),
  messages: z.array(chatMessageSchema),
  personaId: z.string().optional(),
  personaRuntime: digitalPersonaRuntimeStateSchema.optional(),
  personaHighlights: personaRuntimeHighlightsSchema.optional()
});

export type SessionData = z.infer<typeof sessionSchema>;

/** 单轮响应 | Chat turn response */
export const chatTurnResponseSchema = z.object({
  sessionId: z.string(),
  characterState: characterStateSchema,
  assistantMessage: chatMessageSchema,
  imagePrompt: z.string().optional(),
  sessionVersion: z.number().optional(),
  personaId: z.string().optional(),
  personaRuntime: digitalPersonaRuntimeStateSchema.optional(),
  personaHighlights: personaRuntimeHighlightsSchema.optional()
});

export type ChatTurnResponse = z.infer<typeof chatTurnResponseSchema>;

const avatarSchema = z.object({
  id: z.string(),
  characterId: z.string().nullable().optional(),
  statusLabel: z.string(),
  imageUrl: z.string().url(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.number()
});

/** 图片生成响应 | Image generation response */
export const imageGenerationResponseSchema = z.object({
  sessionId: z.string(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  characterState: optionalNormalizedCharacterStateSchema,
  sessionVersion: z.number().optional(),
  avatar: avatarSchema.optional()
});

export type ImageGenerationResponse = z.infer<typeof imageGenerationResponseSchema>;
export type CharacterAvatar = z.infer<typeof avatarSchema>;
