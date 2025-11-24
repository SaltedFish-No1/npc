/**
 * 文件：backend/src/services/prompt/promptEngine.ts
 * 功能描述：系统提示词引擎，按角色与语言加载模板并渲染 | Description: Prompt engine that loads templates by character/language and renders system prompt
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖模板文件、语言工具、字符模型；被聊天服务使用
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { CharacterProfile } from '../characters/characterService.js';
import { CharacterState } from '../../schemas/chat.js';
import { resolveLanguageLabel } from '../../utils/language.js';
import { renderTemplate } from '../../utils/template.js';

/**
 * 提示词引擎：管理模板加载与渲染
 * PromptEngine: Manage template loading and rendering
 */
export class PromptEngine {
  constructor(private readonly templateDir: string) {}

  /**
   * 功能：根据角色、状态与语言构建系统提示词
   * Description: Build system prompt from character, state, and language
   * @param {Object} params - 入参 | Parameters
   * @param {CharacterProfile} params.character - 角色配置 | Character profile
   * @param {CharacterState} params.state - 角色状态 | Character state
   * @param {string} params.languageCode - 语言码 | Language code
   * @returns {string} 系统提示词 | System prompt
   */
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

  /**
   * 复杂算法：模板选择优先级
   * 中文：优先使用 `<id>-<lang>.md`，其次 `<id>-en.md`，最后 `default.md`
   * English: Priority: `<id>-<lang>.md` → `<id>-en.md` → `default.md`
   */
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

  /**
   * 非常规处理：状态标签解析
   * 中文：当压力 ≥99 使用 `broken` 标签，否则使用 `normal` 标签；若未配置则使用默认值
   * English: Use `broken` when stress ≥99, else `normal`; fallback to defaults
   */
  private resolveStateLabel(character: CharacterProfile, state: CharacterState) {
    if (state.stress >= 99) {
      return character.statuses?.broken ?? 'UNSTABLE';
    }
    return character.statuses?.normal ?? 'NORMAL';
  }
}
