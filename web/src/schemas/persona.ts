/**
 * 文件：web/src/schemas/persona.ts
 * 功能描述：前端 DigitalPersona v2 模型 Zod Schema（静态设定与运行态）
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-25  ·  最后修改：2025-11-25
 * 依赖说明：依赖 zod；供前端解析 personaId 与 runtime 状态
 */
import { z } from 'zod';

const metaSchema = z
  .object({
    id: z.string().min(3).max(128),
    name: z.string(),
    version: z.string().optional()
  })
  .passthrough();

const voiceSchema = z
  .object({
    timbre: z.string().optional(),
    base_pitch: z.string().optional()
  })
  .passthrough();

const physiologySchema = z
  .object({
    date_of_birth: z.string().optional(),
    gender: z.string().optional(),
    voice: voiceSchema.optional(),
    appearance_fixed: z.string().optional()
  })
  .passthrough();

const sociologySchema = z
  .object({
    origin_background: z.string().optional(),
    education_history: z.array(z.string()).optional(),
    family_structure: z.string().optional()
  })
  .passthrough();

const psychologySchema = z
  .object({
    mbti: z.string().optional(),
    big_five: z.record(z.union([z.number().min(0).max(1), z.string()])).optional(),
    moral_alignment: z.string().optional()
  })
  .passthrough();

const driveEngineSchema = z
  .object({
    super_objective: z.string().optional(),
    core_fear: z.string().optional()
  })
  .passthrough();

const stressTriggerSchema = z.object({
  event: z.string(),
  sensitivity: z.union([z.number().int().min(1).max(10), z.string()])
});

const looseResponseSchema = z.union([z.string(), z.record(z.any())]);

const stressResponseSchema = z.object({
  mask_mode: looseResponseSchema.optional(),
  defense_mode: looseResponseSchema.optional(),
  breakdown_mode: looseResponseSchema.optional()
});

const stressRulesSchema = z
  .object({
    triggers: z.array(stressTriggerSchema).optional(),
    response_patterns: stressResponseSchema.optional()
  })
  .passthrough();

export const digitalPersonaStaticProfileSchema = z.object({
  meta: metaSchema,
  physiology: physiologySchema,
  sociology: sociologySchema.optional(),
  psychology: psychologySchema.optional(),
  drive_engine: driveEngineSchema.optional(),
  stress_rules: stressRulesSchema.optional()
}).passthrough();

const flexibleAgeSchema = z.union([z.number().int(), z.string()]);

const temporalStatusSchema = z
  .object({
    current_date: z.string().optional(),
    calculated_age: flexibleAgeSchema.optional(),
    mental_age: flexibleAgeSchema.optional()
  })
  .passthrough();

const currentStatusSchema = z
  .object({
    occupation: z.string().optional(),
    social_class: z.string().optional(),
    health_status: z.string().optional(),
    appearance_variable: z.string().optional()
  })
  .passthrough();

const stressMeterSchema = z
  .object({
    current_level: z.number().int().min(0).max(100),
    active_triggers: z.array(z.string()).optional()
  })
  .passthrough();

const sceneContextSchema = z
  .object({
    current_goal: z.string().optional(),
    current_tactic: z.string().optional()
  })
  .passthrough();

const relationshipEntrySchema = z
  .object({
    target_id: z.string(),
    trust_level: z.number().int().min(-100).max(100).optional(),
    knowledge_about_target: z.string().optional()
  })
  .passthrough();

export const digitalPersonaRuntimeStateSchema = z
  .object({
    temporal_status: temporalStatusSchema,
    current_status: currentStatusSchema.optional(),
    stress_meter: stressMeterSchema,
    scene_context: sceneContextSchema,
    relationship_matrix: z.array(relationshipEntrySchema).optional()
  })
  .passthrough();

const runtimePercentMetricSchema = z.object({
  key: z.string(),
  value: z.number().min(0).max(100),
  rawValue: z.number().optional(),
  targetId: z.string().optional()
});

const runtimeNarrativeFactSchema = z.object({
  key: z.string(),
  value: z.string(),
  targetId: z.string().optional()
});

export const personaRuntimeHighlightsSchema = z.object({
  percentMetrics: z.array(runtimePercentMetricSchema),
  narrativeFacts: z.array(runtimeNarrativeFactSchema)
});

export const digitalPersonaSchema = z.object({
  static_profile: digitalPersonaStaticProfileSchema,
  runtime_state: digitalPersonaRuntimeStateSchema
});

export const digitalPersonaRuntimePatchSchema = digitalPersonaRuntimeStateSchema.deepPartial();

export type DigitalPersonaStaticProfile = z.infer<typeof digitalPersonaStaticProfileSchema>;
export type DigitalPersonaRuntimeState = z.infer<typeof digitalPersonaRuntimeStateSchema>;
export type DigitalPersonaRuntimePatch = z.infer<typeof digitalPersonaRuntimePatchSchema>;
export type PersonaRuntimeHighlights = z.infer<typeof personaRuntimeHighlightsSchema>;
export type DigitalPersonaV2 = z.infer<typeof digitalPersonaSchema>;
