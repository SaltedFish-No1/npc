import { z } from 'zod';
import { CHARACTER_PROFILE } from '@/config/characterProfile';
import { unifiedCharacterModelSchema } from '@/schemas/character';

export const characterStateSchema = z.object({
  stress: z.number().min(0).max(100).default(0),
  trust: z.number().min(0).max(100).default(50),
  mode: z.enum(['NORMAL', 'ELEVATED', 'BROKEN', '???%']).default('NORMAL'),
  name: z.string().default(CHARACTER_PROFILE.defaultName),
  avatarUrl: z.string().url().optional().or(z.literal(''))
});

export type CharacterState = z.infer<typeof characterStateSchema>;

const optionalNormalizedCharacterStateSchema = characterStateSchema
  .optional()
  .transform((value) => (value ? characterStateSchema.parse(value) : undefined));

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
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
  sessionId: z.string(),
  characterId: z.string(),
  languageCode: z.string(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  version: z.number().optional(),
  characterState: characterStateSchema,
  characterModel: unifiedCharacterModelSchema.optional(),
  messages: z.array(chatMessageSchema)
});

export type SessionData = z.infer<typeof sessionSchema>;

export const chatTurnResponseSchema = z.object({
  sessionId: z.string(),
  characterState: characterStateSchema,
  assistantMessage: chatMessageSchema,
  imagePrompt: z.string().optional(),
  sessionVersion: z.number().optional()
});

export type ChatTurnResponse = z.infer<typeof chatTurnResponseSchema>;

export const imageGenerationResponseSchema = z.object({
  sessionId: z.string(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  characterState: optionalNormalizedCharacterStateSchema,
  sessionVersion: z.number().optional()
});

export type ImageGenerationResponse = z.infer<typeof imageGenerationResponseSchema>;
