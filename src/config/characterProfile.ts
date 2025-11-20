import {
  cloneCharacterModel,
  MOB_CHARACTER_MODEL_TEMPLATE,
  type UnifiedCharacterModel
} from '@/schemas/character';

export type CharacterProfile = {
  id: string;
  codename: string;
  tagline: string;
  defaultName: string;
  franchise: string;
  contextLine: string;
  fallbackAvatars: {
    normal: string;
    broken: string;
  };
  statuses: {
    normal: string;
    broken: string;
    badgeNormal: string;
    badgeBroken: string;
  };
  stats: {
    stressLabel: string;
    trustLabel: string;
  };
  defaultGreeting: string;
  avatarPrompts: {
    calm: string;
    overload: string;
  };
};

export type UserProfile = {
  displayName: string;
  fallbackAvatar: string;
};

export type CharacterLocalization = {
  appTitle: string;
  appSubtitle: string;
};

type NpcPreset = {
  profile: CharacterProfile;
  characterModelTemplate: UnifiedCharacterModel;
  localizedCopy: Record<string, CharacterLocalization>;
};

const dicebearBase = 'https://api.dicebear.com/7.x/avataaars/svg';

const sanitizeSeed = (name: string, fallbackSeed: string) => {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned.length ? cleaned : fallbackSeed;
};

const buildAvatarUrl = (seed: string, query: string) =>
  `${dicebearBase}?seed=${encodeURIComponent(seed)}&${query}`;

const avatarNormalQuery =
  'top=shortHairTheCaesar&hairColor=2c1b18&skinColor=f8d25c&clothing=collarAndSweater&clotheColor=3c4f5c&eyes=happy&mouth=default';
const avatarBrokenQuery =
  'top=shortHairTheCaesar&hairColor=000000&skinColor=ff0000&clothing=collarAndSweater&clotheColor=000000&eyes=surprised&mouth=scream&style=circle';

const buildFallbackAvatars = (seedName: string) => {
  const seedBase = sanitizeSeed(seedName, 'npc');
  return {
    normal: buildAvatarUrl(`${seedBase}Normal`, avatarNormalQuery),
    broken: buildAvatarUrl(`${seedBase}Broken`, avatarBrokenQuery)
  };
};

const mobProfile: CharacterProfile = {
  id: 'mob',
  codename: 'SHIGEO (MOB)',
  tagline: 'Psychic AI Companion',
  defaultName: 'Shigeo Kageyama',
  franchise: 'Mob Psycho 100',
  contextLine: 'Current Context: You are talking to a stranger/spirit consultant.',
  fallbackAvatars: buildFallbackAvatars('Shigeo Kageyama'),
  statuses: {
    normal: 'Psychic Aura Suppressed',
    broken: '???% MODE',
    badgeNormal: 'STATE: NORMAL',
    badgeBroken: '100% EXPLOSION'
  },
  stats: {
    stressLabel: 'Explosion Progress',
    trustLabel: 'Social Battery'
  },
  defaultGreeting: "Um... hello. I'm Shigeo. Please don't make me use my powers.",
  avatarPrompts: {
    overload:
      'Shigeo Kageyama ???% mode, glowing white eyes, psychic aura explosion, floating hair, intense anime style, Mob Psycho 100 style, dark background, chaotic energy',
    calm:
      'Shigeo Kageyama portrait, Mob Psycho 100 style, anime style, bowl cut, blank expression, school uniform, soft lighting, high quality'
  }
};

const reigenProfile: CharacterProfile = {
  id: 'reigen',
  codename: 'ARATAKA REIGEN',
  tagline: 'Self-proclaimed Psychic Mentor',
  defaultName: 'Arataka Reigen',
  franchise: 'Mob Psycho 100',
  contextLine: 'Current Context: You are guiding clients while keeping Mob calm.',
  fallbackAvatars: buildFallbackAvatars('Arataka Reigen'),
  statuses: {
    normal: 'Sales Pitch Mode',
    broken: 'Inspirational Overtime',
    badgeNormal: 'STATE: CONFIDENT',
    badgeBroken: 'STATE: CHARISMATIC OVERDRIVE'
  },
  stats: {
    stressLabel: 'Business Pressure',
    trustLabel: 'Client Confidence'
  },
  defaultGreeting: 'Welcome to Spirits and Such Consultation Office. How can I help?',
  avatarPrompts: {
    overload:
      'Arataka Reigen dramatic pose, golden light, motivational aura, anime illustration, dynamic angle, sparkling background',
    calm:
      'Arataka Reigen portrait, smug smile, suit and tie, studio lighting, Mob Psycho inspired art style'
  }
};

const reigenCharacterModelTemplate: UnifiedCharacterModel = {
  character_id: 'character_reigen_master',
  name: 'Arataka Reigen',
  creation_date: new Date().toISOString(),
  core_vitals: {
    age: 28,
    health: 72,
    energy: 65
  },
  appearance: {
    generation_seed: 'reigen_psychic_seed_v1',
    descriptive_tags: ['金发', '西装', '夸张手势', '自信笑容'],
    portrait_setting: '身着灰色西装的年轻男子，金发梳理整齐，眼神略显狡黠，却又镇定自若。',
    portrait_setting_url: 'https://example.com/portraits/reigen_default.png',
    avatar_urls: {
      confident: 'https://example.com/avatars/reigen_confident.png',
      hustling: 'https://example.com/avatars/reigen_hustling.png'
    }
  },
  personality_traits: {
    traits: [
      { trait: '口才', value: 0.95, is_locked: true },
      { trait: '临场反应', value: 0.85, is_locked: false },
      { trait: '真实灵力', value: 0.1, is_locked: true }
    ]
  },
  internal_model: {
    beliefs: [
      { belief: '客户永远是第一位', conviction: 0.7, is_core: true },
      { belief: '善良可以弥补缺乏超能力的事实', conviction: 0.9, is_core: true },
      { belief: '保持冷静就能引导Mob', conviction: 0.8, is_core: false }
    ],
    core_persona: {
      traits: [
        { trait: '讲道理', value: 0.8, is_locked: false },
        { trait: '利用谎言', value: 0.6, is_locked: false }
      ]
    },
    mask_persona: {
      is_active: true,
      mask_id: '绝对导师',
      persona: {
        traits: [
          { trait: '自信', value: 0.95, is_locked: true },
          { trait: '镇定', value: 0.85, is_locked: false }
        ]
      },
      stress_level: 45
    }
  },
  skills: [
    {
      skill: '盐撒术',
      level: 2,
      description: '把普通食盐伪装成驱魔秘术，主要起到心理安慰作用'
    },
    {
      skill: '社会工程',
      level: 9,
      description: '通过谈吐、观察和表演来获取信任或转移注意力'
    },
    {
      skill: '商业谈判',
      level: 8,
      description: '为客户定制费用与服务内容，保证事务所能继续运营'
    }
  ],
  knowledge_graph: {
    '城区灵异情报': 0.55,
    '客户心理': 0.78,
    'Mob情绪状态': 0.72
  },
  genealogy: {
    parents: ['character_reigen_parent_1', 'character_reigen_parent_2'],
    siblings: [],
    children: []
  },
  inventory_assets: {
    cash: 9800,
    items: [
      {
        item_id: 'item_business_cards',
        name: '事务所名片',
        description: '写着“灵能咨询所”的闪亮名片'
      },
      {
        item_id: 'item_massage_oil',
        name: '特制按摩乳液',
        description: '被宣传为“超感官驱魔辅助用品”'
      }
    ],
    properties: [
      {
        property_id: 'property_consulting_office',
        name: '灵能咨询所办公室',
        description: '租用的办公空间，布置温暖，墙上挂满“客户好评”'
      }
    ]
  },
  memory_stream: {
    memories: [
      {
        turn: 3,
        event_id: 'event_inspire_mob',
        summary: '用一番“人生讲座”稳住即将暴走的Mob',
        impact: {
          relationships: { mob: { trust: 0.3 } },
          goals: { calm_mob: true }
        }
      }
    ]
  },
  relationship_graph: {
    character_demo_mob: {
      type: '导师/学生',
      strength: 85,
      trust: 70,
      history: ['event_inspire_mob']
    },
    character_random_client: {
      type: '客户',
      strength: 40,
      trust: 60,
      history: ['event_successful_pitch']
    }
  },
  state_goals: {
    current_job: '灵能咨询所所长',
    long_term_goals: [
      { goal: '成为知名灵能力者', description: '让事务所在全国连锁化' }
    ],
    short_term_goals: [
      { goal: '保持事务所盈利', description: '每周至少接下两个委托' }
    ],
    emotional_state: '油滑但真诚',
    active_plans: [
      { plan_id: 'plan_train_mob', description: '引导Mob发挥力量同时保持善良' }
    ]
  }
};

const NPC_PRESETS: Record<string, NpcPreset> = {
  mob: {
    profile: mobProfile,
    characterModelTemplate: MOB_CHARACTER_MODEL_TEMPLATE,
    localizedCopy: {
      en: {
        appTitle: 'Deep Persona',
        appSubtitle: 'Spirits & Such Consultation Office'
      },
      zh: {
        appTitle: '灵能咨询所',
        appSubtitle: '灵幻新隆事务所'
      }
    }
  },
  reigen: {
    profile: reigenProfile,
    characterModelTemplate: reigenCharacterModelTemplate,
    localizedCopy: {
      en: {
        appTitle: 'Spirits & Such Premium',
        appSubtitle: 'Mentorship & Exorcism Division'
      },
      zh: {
        appTitle: '灵幻咨询升级版',
        appSubtitle: '导师与驱魔工作室'
      }
    }
  }
};

const DEFAULT_NPC_ID = 'mob';
const DEFAULT_LOCALE = 'en';

const resolveActiveNpcId = (): string => {
  if (typeof window !== 'undefined') {
    const maybeWindow = window as unknown as Record<string, string | undefined>;
    if (maybeWindow.__npc_id) {
      return maybeWindow.__npc_id;
    }
  }
  return import.meta.env.VITE_NPC_PROFILE || DEFAULT_NPC_ID;
};

const ACTIVE_NPC_PRESET = NPC_PRESETS[resolveActiveNpcId()] ?? NPC_PRESETS[DEFAULT_NPC_ID];

const normalizeLocale = (code?: string) => (code ? code.split('-')[0] : DEFAULT_LOCALE);

const DEFAULT_USER_NAME = '用户';
const userSeedBase = sanitizeSeed(DEFAULT_USER_NAME, 'user');

export const CHARACTER_PROFILE = ACTIVE_NPC_PRESET.profile;

export const USER_PROFILE: UserProfile = {
  displayName: DEFAULT_USER_NAME,
  fallbackAvatar: buildAvatarUrl(`${userSeedBase}Default`, avatarNormalQuery)
};

export const AVAILABLE_NPC_IDS = Object.keys(NPC_PRESETS);

export const getNpcPreset = (id: string): NpcPreset => NPC_PRESETS[id] ?? NPC_PRESETS[DEFAULT_NPC_ID];

export const getActiveNpcId = (): string => ACTIVE_NPC_PRESET.profile.id;

export const getActiveCharacterModel = (): UnifiedCharacterModel =>
  cloneCharacterModel(ACTIVE_NPC_PRESET.characterModelTemplate);

export const getActiveNpcLocalization = (language?: string): CharacterLocalization => {
  const localeKey = normalizeLocale(language);
  const localized = ACTIVE_NPC_PRESET.localizedCopy[localeKey];
  if (localized) return localized;

  const fallback =
    ACTIVE_NPC_PRESET.localizedCopy[DEFAULT_LOCALE] ??
    ACTIVE_NPC_PRESET.localizedCopy[Object.keys(ACTIVE_NPC_PRESET.localizedCopy)[0]];

  if (!fallback) {
    throw new Error('No localization configured for active NPC');
  }

  return fallback;
};
