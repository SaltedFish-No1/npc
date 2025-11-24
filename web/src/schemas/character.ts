/**
 * 文件：web/src/schemas/character.ts
 * 功能描述：统一角色模型（Zod）与模板工具 | Description: Unified character model (Zod) and template utilities
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 zod 与 JSON deepClone
 */
import { z } from 'zod';

/**
 * 功能：深拷贝对象（优先使用 structuredClone）
 * Description: Deep clone using structuredClone if available
 */
const deepClone = <T>(value: T): T => {
  if ('structuredClone' in globalThis) {
    return (globalThis.structuredClone as <U>(input: U) => U)(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const identifierSchema = z.object({
  character_id: z.string(),
  name: z.string(),
  creation_date: z.string().datetime()
});

const coreVitalsSchema = z.object({
  age: z.number().nonnegative(),
  health: z.number().min(0).max(100),
  energy: z.number().min(0).max(100)
});

const appearanceSchema = z.object({
  generation_seed: z.string(),
  descriptive_tags: z.array(z.string()),
  portrait_setting: z.string(),
  portrait_setting_url: z.string().url().optional(),
  avatar_urls: z.record(z.string().url())
});

const traitSchema = z.object({
  trait: z.string(),
  value: z.number().min(0).max(1),
  is_locked: z.boolean().default(false)
});

const personalityTraitsSchema = z.object({
  traits: z.array(traitSchema)
});

const beliefSchema = z.object({
  belief: z.string(),
  conviction: z.number().min(0).max(1),
  is_core: z.boolean().default(false)
});

const personaSchema = z.object({
  traits: z.array(traitSchema)
});

const maskPersonaSchema = z.object({
  is_active: z.boolean().default(false),
  mask_id: z.string(),
  persona: personaSchema,
  stress_level: z.number().min(0).max(100)
});

const internalModelSchema = z.object({
  beliefs: z.array(beliefSchema),
  core_persona: personaSchema,
  mask_persona: maskPersonaSchema
});

const skillSchema = z.object({
  skill: z.string(),
  level: z.number().int().min(0),
  description: z.string()
});

const genealogySchema = z.object({
  parents: z.array(z.string()),
  siblings: z.array(z.string()),
  children: z.array(z.string())
});

const inventoryItemSchema = z.object({
  item_id: z.string(),
  name: z.string(),
  description: z.string()
});

const assetSchema = z.object({
  property_id: z.string(),
  name: z.string(),
  description: z.string()
});

const inventoryAssetsSchema = z.object({
  cash: z.number(),
  items: z.array(inventoryItemSchema),
  properties: z.array(assetSchema)
});

const memoryImpactSchema = z.record(z.any());

const memorySchema = z.object({
  turn: z.number().int().nonnegative(),
  event_id: z.string(),
  summary: z.string(),
  impact: memoryImpactSchema
});

const memoryStreamSchema = z.object({
  memories: z.array(memorySchema)
});

const relationshipSchema = z.object({
  type: z.string(),
  strength: z.number().min(-100).max(100),
  trust: z.number().min(-100).max(100),
  history: z.array(z.string())
});

const goalSchema = z.object({
  goal: z.string(),
  description: z.string()
});

const planSchema = z.object({
  plan_id: z.string(),
  description: z.string()
});

const stateGoalsSchema = z.object({
  current_job: z.string().optional(),
  long_term_goals: z.array(goalSchema),
  short_term_goals: z.array(goalSchema),
  emotional_state: z.string(),
  active_plans: z.array(planSchema)
});

/** 统一角色模型 | Unified character model schema */
export const unifiedCharacterModelSchema = z.object({
  ...identifierSchema.shape,
  core_vitals: coreVitalsSchema,
  appearance: appearanceSchema,
  personality_traits: personalityTraitsSchema,
  internal_model: internalModelSchema,
  skills: z.array(skillSchema),
  knowledge_graph: z.record(z.number()),
  genealogy: genealogySchema,
  inventory_assets: inventoryAssetsSchema,
  memory_stream: memoryStreamSchema,
  relationship_graph: z.record(relationshipSchema),
  state_goals: stateGoalsSchema
});

export type UnifiedCharacterModel = z.infer<typeof unifiedCharacterModelSchema>;

const mobCharacterModelTemplate: UnifiedCharacterModel = {
  character_id: 'character_demo_mob',
  name: 'Shigeo Kageyama',
  creation_date: new Date().toISOString(),
  core_vitals: {
    age: 14,
    health: 90,
    energy: 75
  },
  appearance: {
    generation_seed: 'mob_psychic_seed_v1',
    descriptive_tags: ['黑发', '学生制服', '稍显木讷'],
    portrait_setting: '平平无奇的初中生，情绪波澜不显，但体内潜藏惊人灵力',
    portrait_setting_url: 'https://example.com/portraits/mob_default.png',
    avatar_urls: {
      calm: 'https://example.com/avatars/mob_calm.png',
      stressed: 'https://example.com/avatars/mob_stressed.png'
    }
  },
  personality_traits: {
    traits: [
      { trait: '内向', value: 0.7, is_locked: false },
      { trait: '情绪压抑', value: 0.85, is_locked: true }
    ]
  },
  internal_model: {
    beliefs: [
      { belief: '避免使用力量才能保护身边的人', conviction: 0.8, is_core: true },
      { belief: '情绪失控会带来灾难', conviction: 0.9, is_core: true }
    ],
    core_persona: {
      traits: [
        { trait: '善良', value: 0.95, is_locked: true },
        { trait: '自我怀疑', value: 0.6, is_locked: false }
      ]
    },
    mask_persona: {
      is_active: false,
      mask_id: '普通学生',
      persona: {
        traits: [
          { trait: '木讷', value: 0.8, is_locked: false },
          { trait: '礼貌', value: 0.9, is_locked: false }
        ]
      },
      stress_level: 20
    }
  },
  skills: [
    {
      skill: '超能力控制',
      level: 8,
      description: '可持续释放念动力并控制对象，但情绪越激动消耗越大'
    }
  ],
  knowledge_graph: {
    '灵幻的真实实力': 0.6,
    '城市中的灵异事件': 0.4
  },
  genealogy: {
    parents: ['character_mob_mother', 'character_mob_father'],
    siblings: ['character_ritsu'],
    children: []
  },
  inventory_assets: {
    cash: 120,
    items: [
      {
        item_id: 'item_school_bag',
        name: '书包',
        description: '普通的黑色书包'
      }
    ],
    properties: []
  },
  memory_stream: {
    memories: [
      {
        turn: 1,
        event_id: 'event_meeting_reigen',
        summary: '与灵幻认识并成为其助手',
        impact: {
          relationships: { reigen: { trust: 0.2 } }
        }
      }
    ]
  },
  relationship_graph: {
    character_reigen: {
      type: '师徒',
      strength: 70,
      trust: 80,
      history: ['event_meeting_reigen']
    }
  },
  state_goals: {
    current_job: '灵能咨询所助手',
    long_term_goals: [
      { goal: '掌控情绪', description: '在保持冷静的同时行善' }
    ],
    short_term_goals: [
      { goal: '帮助新的委托人', description: '解决灵异事件并保护普通人' }
    ],
    emotional_state: '平静但紧绷',
    active_plans: [
      { plan_id: 'plan_support_reigen', description: '协助灵幻处理新的委托' }
    ]
  }
};

/** Mob 角色模型模板 | Mob character model template */
export const MOB_CHARACTER_MODEL_TEMPLATE = mobCharacterModelTemplate;

/**
 * 功能：克隆角色模型模板
 * Description: Clone character model template
 */
export const cloneCharacterModel = (template: UnifiedCharacterModel): UnifiedCharacterModel =>
  deepClone(template);

/**
 * 功能：创建默认的统一角色模型（基于 Mob 模板）
 * Description: Create default unified character model (Mob template)
 */
export const createDefaultUnifiedCharacterModel = (): UnifiedCharacterModel =>
  cloneCharacterModel(mobCharacterModelTemplate);
