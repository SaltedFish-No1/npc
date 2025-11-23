import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import yaml from 'js-yaml';
import { z } from 'zod';

import { logger } from '../../logger.js';
import { characterStateSchema } from '../../schemas/chat.js';

const characterProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  codename: z.string(),
  franchise: z.string(),
  contextLine: z.string(),
  defaultGreeting: z.string(),
  defaultState: characterStateSchema,
  imageStyleGuidelines: z.string(),
  statuses: z.record(z.string()),
  languages: z.array(z.string()),
  capabilities: z.object({ text: z.boolean(), image: z.boolean() }),
  models: z.object({ text: z.string(), image: z.string() })
});

export type CharacterProfile = z.infer<typeof characterProfileSchema>;

export type CharacterSummary = {
  id: string;
  name: string;
  codename: string;
  avatarUrl?: string;
  languages: string[];
  capabilities: CharacterProfile['capabilities'];
};

export class CharacterService {
  private readonly cache = new Map<string, CharacterProfile>();

  constructor(private readonly charactersDir: string) {
    this.reload();
  }

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

  listCharacters(): CharacterSummary[] {
    return Array.from(this.cache.values()).map((profile) => ({
      id: profile.id,
      name: profile.name,
      codename: profile.codename,
      avatarUrl: profile.defaultState.avatarUrl,
      languages: profile.languages,
      capabilities: profile.capabilities
    }));
  }

  getCharacterOrThrow(id: string): CharacterProfile {
    const profile = this.cache.get(id);
    if (!profile) {
      throw new Error(`Character ${id} not found`);
    }
    return profile;
  }
}
