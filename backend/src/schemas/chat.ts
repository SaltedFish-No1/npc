/**
 * 文件：backend/src/schemas/chat.ts
 * 功能描述：后端 Zod 模型定义（角色状态、聊天消息、AI 响应、会话数据） | Description: Backend Zod schemas for character state, chat message, AI response, session data
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 zod；被服务与路由用于校验
 */
import { z } from 'zod';

/** 角色状态 | Character state */
export const characterStateSchema = z.object({
  stress: z.number().min(0).max(100),
  trust: z.number().min(0).max(100),
  mode: z.enum(['NORMAL', 'ELEVATED', 'BROKEN']).default('NORMAL'),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  avatarId: z.string().optional(),
  avatarLabel: z.string().optional()
});

export type CharacterState = z.infer<typeof characterStateSchema>;

/** 聊天消息 | Chat message */
export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  thought: z.string().optional(),
  stressChange: z.number().optional(),
  trustChange: z.number().optional(),
  currentStress: z.number().optional(),
  imagePrompt: z.string().optional(),
  imageUrl: z.string().url().optional(),
  messageId: z.string().optional(),
  createdAt: z.number().optional()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** AI 响应 | AI response */
export const aiResponseSchema = z.object({
  thought: z.string(),
  stress_change: z.number(),
  trust_change: z.number(),
  response: z.string(),
  image_prompt: z.string().optional()
});

export type AIResponse = z.infer<typeof aiResponseSchema>;

/** 会话数据 | Session data */
export const sessionDataSchema = z.object({
  sessionId: z.string(),
  characterId: z.string(),
  languageCode: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number(),
  characterState: characterStateSchema,
  messages: z.array(chatMessageSchema)
});

export type SessionData = z.infer<typeof sessionDataSchema>;
