import { z } from 'zod';

export const characterStateSchema = z.object({
  stress: z.number().min(0).max(100),
  trust: z.number().min(0).max(100),
  mode: z.enum(['NORMAL', 'ELEVATED', 'BROKEN']).default('NORMAL'),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional()
});

export type CharacterState = z.infer<typeof characterStateSchema>;

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  thought: z.string().optional(),
  stressChange: z.number().optional(),
  trustChange: z.number().optional(),
  currentStress: z.number().optional(),
  imagePrompt: z.string().optional()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const aiResponseSchema = z.object({
  thought: z.string(),
  stress_change: z.number(),
  trust_change: z.number(),
  response: z.string(),
  image_prompt: z.string().optional()
});

export type AIResponse = z.infer<typeof aiResponseSchema>;

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
