/**
 * 文件：backend/src/services/characters/characterService.ts
 * 功能描述：角色配置管理与校验，支持列表与获取 | Description: Manage and validate character profiles; list and fetch operations
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 YAML、Zod、文件系统与日志器
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import yaml from 'js-yaml';
import { z } from 'zod';

import { logger } from '../../logger.js';
import { characterStateSchema } from '../../schemas/chat.js';
import { digitalPersonaSchema, type DigitalPersonaV2 } from '../../schemas/persona.js';

const localizedStringSchema = z
  .record(z.string())
  .refine((value) => Object.keys(value).length > 0, 'display localization map must contain at least one locale');

const statusLineSchema = z.object({
  normal: localizedStringSchema,
  broken: localizedStringSchema.optional()
});

const characterDisplaySchema = z.object({
  title: localizedStringSchema,
  subtitle: localizedStringSchema.optional(),
  chatTitle: localizedStringSchema.optional(),
  chatSubline: localizedStringSchema.optional(),
  statusLine: statusLineSchema.optional(),
  inputPlaceholder: localizedStringSchema.optional()
});

const characterProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  codename: z.string(),
  franchise: z.string(),
  contextLine: z.string(),
  defaultGreeting: z.string(),
  defaultState: characterStateSchema,
  imageStyleGuidelines: z.string(),
  imagePrompts: z
    .object({
      avatar: z.record(z.string()).optional(),
      scene: z.record(z.string()).optional(),
      fallback: z.string().optional()
    })
    .optional(),
  statuses: z.record(z.string()),
  languages: z.array(z.string()),
  capabilities: z.object({ text: z.boolean(), image: z.boolean() }),
  models: z.object({ text: z.string(), image: z.string() }),
  persona: digitalPersonaSchema.optional(),
  display: characterDisplaySchema.optional()
});

export type CharacterProfile = z.infer<typeof characterProfileSchema>;
export type CharacterPersona = DigitalPersonaV2;

type LocalizedStringMap = z.infer<typeof localizedStringSchema>;

export type CharacterDisplayStrings = {
  title?: string;
  subtitle?: string;
  chatTitle?: string;
  chatSubline?: string;
  statusLine?: {
    normal?: string;
    broken?: string;
  };
  inputPlaceholder?: string;
};

export type CharacterSummary = {
  id: string;
  name: string;
  codename: string;
  avatarUrl?: string;
  languages: string[];
  capabilities: CharacterProfile['capabilities'];
  display?: CharacterDisplayStrings;
};

/**
 * 角色服务：加载、校验并缓存角色配置
 * CharacterService: Load, validate and cache character profiles
 */
export class CharacterService {
  private readonly cache = new Map<string, CharacterProfile>();

  constructor(private readonly charactersDir: string) {
    this.reload();
  }

  /**
   * 功能：重新加载角色配置文件并进行 Zod 校验
   * Description: Reload character profiles and validate with Zod
   */
  reload() {
    this.cache.clear();
    const files = readdirSync(this.charactersDir).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));
    files.forEach((file) => {
      const fullPath = path.join(this.charactersDir, file);
      try {
        const raw = readFileSync(fullPath, 'utf-8');
        const parsed = characterProfileSchema.safeParse(yaml.load(raw));
        if (!parsed.success) {
          logger.warn({ file, issues: parsed.error.issues }, 'Character profile validation failed');
          return;
        }
        this.cache.set(parsed.data.id, parsed.data);
      } catch (error) {
        logger.error({ file, error }, 'Failed to read character profile');
      }
    });
    if (!this.cache.size) {
      throw new Error(`No character profiles found under ${this.charactersDir}`);
    }
  }

  /**
   * 功能：返回角色摘要列表，并根据语言选择展示 copy
   * Description: Return character summary list with localized display fields
   * @param {string} [languageCode] 请求者语言（`xx` or `xx-YY`）| Optional language code used for localization
   */
  listCharacters(languageCode?: string): CharacterSummary[] {
    return Array.from(this.cache.values()).map((profile) => ({
      id: profile.id,
      name: profile.name,
      codename: profile.codename,
      avatarUrl: profile.defaultState.avatarUrl,
      languages: this.normalizeLanguages(profile.languages),
      capabilities: profile.capabilities,
      display: this.resolveDisplayStrings(profile, languageCode)
    }));
  }

  /**
   * 功能：按ID获取角色配置，若不存在则抛错
   * Description: Get character profile by ID or throw if missing
   */
  getCharacterOrThrow(id: string): CharacterProfile {
    const profile = this.cache.get(id);
    if (!profile) {
      throw new Error(`Character ${id} not found`);
    }
    return profile;
  }

  /**
   * 功能：解析展示配置的多语言文案
   * Description: Resolve localized display strings from profile config
   */
  private resolveDisplayStrings(profile: CharacterProfile, languageCode?: string): CharacterDisplayStrings | undefined {
    if (!profile.display) return undefined;
    return {
      title: this.resolveLocalizedString(profile.display.title, languageCode),
      subtitle: this.resolveLocalizedString(profile.display.subtitle, languageCode),
      chatTitle: this.resolveLocalizedString(profile.display.chatTitle, languageCode),
      chatSubline: this.resolveLocalizedString(profile.display.chatSubline, languageCode),
      statusLine: profile.display.statusLine
        ? {
            normal: this.resolveLocalizedString(profile.display.statusLine.normal, languageCode),
            broken: this.resolveLocalizedString(profile.display.statusLine.broken, languageCode)
          }
        : undefined,
      inputPlaceholder: this.resolveLocalizedString(profile.display.inputPlaceholder, languageCode)
    };
  }

  private resolveLocalizedString(map?: LocalizedStringMap, languageCode?: string) {
    if (!map) return undefined;
    const preferred = this.buildLanguageOrder(languageCode);
    for (const candidate of preferred) {
      const match = map[candidate];
      if (match) return match;
    }
    // 返回配置中的第一个值作为兜底
    const firstValue = Object.values(map)[0];
    return firstValue;
  }

  private buildLanguageOrder(languageCode?: string) {
    if (!languageCode) return ['zh-cn', 'zh', 'en'];
    const normalized = languageCode.toLowerCase();
    const base = normalized.split('-')[0];
    const order = [normalized];
    if (base && base !== normalized) {
      order.push(base);
    }
    if (!order.includes('en')) {
      order.push('en');
    }
    return order;
  }

  private normalizeLanguages(languages: string[]): string[] {
    const seen = new Set<string>();
    for (const raw of languages) {
      const normalized = this.sanitizeLanguageCode(raw);
      if (normalized) {
        seen.add(normalized);
      }
    }
    return Array.from(seen);
  }

  private sanitizeLanguageCode(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return undefined;
    const match = trimmed.match(/[a-z]{2}(?:-[a-z]{2})?/);
    return match ? match[0] : trimmed;
  }
}
