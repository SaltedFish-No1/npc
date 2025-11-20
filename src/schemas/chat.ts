import { z } from 'zod';
import { CHARACTER_PROFILE } from '@/config/characterProfile';
import { unifiedCharacterModelSchema } from '@/schemas/character';

export const characterStateSchema = z.object({
  stress: z.number().min(0).max(100).default(0),
  trust: z.number().min(0).max(100).default(50),
  mode: z.enum(['NORMAL', '???%']).default('NORMAL'),
  name: z.string().default(CHARACTER_PROFILE.defaultName),
  avatarUrl: z.string().url().optional().or(z.literal(''))
});

export type CharacterState = z.infer<typeof characterStateSchema>;

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  thought: z.string().optional(),
  stressChange: z.number().optional(),
  trustChange: z.number().optional(),
  currentStress: z.number().optional(),
  imageUrl: z.string().url().optional(),
  imagePrompt: z.string().optional()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const sessionSchema = z.object({
  createdAt: z.any().optional(),
  characterState: characterStateSchema,
  characterModel: unifiedCharacterModelSchema.optional(),
  messages: z.array(chatMessageSchema)
});

export type SessionData = z.infer<typeof sessionSchema>;

export const aiResponseSchema = z.object({
  thought: z.string().optional(),
  stress_change: z.number().optional().default(0),
  trust_change: z.number().optional().default(0),
  response: z.string(),
  image_prompt: z.string().optional()
});

export type AIResponse = z.infer<typeof aiResponseSchema>;

export const settingsSchema = z.object({
  apiKey: z.string().trim().min(10, 'API key is required')
});

export type SettingsForm = z.infer<typeof settingsSchema>;
