import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { CharacterService } from '../src/services/characters/characterService.js';

/**
 * 目的：确保 persona meta.id 即便不是 UUID（例如 slug），角色也不会被过滤掉。
 */
describe('CharacterService persona compatibility', () => {
  it('loads characters with slug persona IDs', () => {
    const charactersDir = path.resolve(process.cwd(), 'config/characters');
    const service = new CharacterService(charactersDir);
    const roster = service.listCharacters();
    const snape = roster.find((character) => character.id === 'severus_snape');
    expect(snape).toBeTruthy();
    expect(snape?.languages).toContain('zh');
  });

  it('resolves localized display strings', () => {
    const charactersDir = path.resolve(process.cwd(), 'config/characters');
    const service = new CharacterService(charactersDir);
    const roster = service.listCharacters('zh-CN');
    const mob = roster.find((character) => character.id === 'mob');
    expect(mob?.display?.title).toBe('灵能咨询所');
    expect(mob?.display?.chatTitle).toBe('影山茂夫');
    expect(mob?.display?.inputPlaceholder).toBe('和影山聊聊你在意的事...');
  });
});
