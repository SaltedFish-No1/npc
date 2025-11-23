import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { CharacterProfile } from '../characters/characterService.js';
import { CharacterState } from '../../schemas/chat.js';
import { resolveLanguageLabel } from '../../utils/language.js';
import { renderTemplate } from '../../utils/template.js';

export class PromptEngine {
  constructor(private readonly templateDir: string) {}

  buildSystemPrompt(params: {
    character: CharacterProfile;
    state: CharacterState;
    languageCode: string;
  }): string {
    const template = this.loadTemplate(params.character.id, params.languageCode);
    const language = resolveLanguageLabel(params.languageCode);
    const stateLabel = this.resolveStateLabel(params.character, params.state);

    return renderTemplate(template, {
      character: params.character,
      state: params.state,
      language,
      stateLabel
    });
  }

  private loadTemplate(characterId: string, languageCode: string) {
    const direct = path.join(this.templateDir, `${characterId}-${languageCode}.md`);
    const fallback = path.join(this.templateDir, `${characterId}-en.md`);
    const defaultTemplate = path.join(this.templateDir, 'default.md');

    if (existsSync(direct)) {
      return readFileSync(direct, 'utf-8');
    }
    if (existsSync(fallback)) {
      return readFileSync(fallback, 'utf-8');
    }
    return readFileSync(defaultTemplate, 'utf-8');
  }

  private resolveStateLabel(character: CharacterProfile, state: CharacterState) {
    if (state.stress >= 99) {
      return character.statuses?.broken ?? 'UNSTABLE';
    }
    return character.statuses?.normal ?? 'NORMAL';
  }
}
