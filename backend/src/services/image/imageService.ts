/**
 * 文件：backend/src/services/image/imageService.ts
 * 功能描述：图片生成服务，基于角色配置/意图推导提示并可更新头像 | Description: Image generation service that derives prompts from character config + intent and can update avatars
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 LLMClient 与 SessionService
 */
import { SessionService } from '../sessions/sessionService.js';
import { LLMClient } from '../../clients/llmClient.js';
import { SessionData } from '../../schemas/chat.js';
import { AvatarService, StoredAvatar } from '../avatars/avatarService.js';
import { CharacterProfile, CharacterService } from '../characters/characterService.js';
  /**
   * 功能：处理图片生成，请求端只声明意图/情绪，由服务读取角色配置得出提示词；必要时复用会话 image_prompt
   * Description: Generate an image using backend-owned prompts resolved from character intent/mood, optionally falling back to the latest session image prompt
   * @param {Object} params - 入参 | Parameters
   * @param {SessionData} params.session - 会话数据 | Session snapshot for context/state
   * @param {'avatar'|'scene'} [params.intent] - 生成意图（头像/场景） | High-level generation intent
   * @param {string} [params.avatarMood] - 头像情绪/标签提示 | Optional avatar label hint
   * @param {'1:1'|'16:9'|'4:3'} [params.ratio] - 图片比例（缺省按意图推导） | Target aspect ratio (defaults per intent)
   * @param {boolean} [params.useImagePrompt] - 为真时优先复用最新助手 imagePrompt | Whether to reuse latest assistant imagePrompt
   * @param {boolean} [params.updateAvatar] - 是否更新头像为生成图片 | Update avatar with generated image
   * @param {Record<string, unknown>} [params.metadata] - 附加追踪字段 | Telemetry metadata
   * @returns {Promise<{imageUrl:string;session:SessionData;avatar?:StoredAvatar}>} 图片地址与最新会话 | Generated image + updated session snapshot
   */
    private readonly avatarService: AvatarService,
    private readonly characterService: CharacterService
  ) {}

  /**
   * 功能：处理图片生成，支持优先使用会话中最新的 `image_prompt`
   * Description: Generate image, optionally using latest `image_prompt` from session
   * @param {Object} params - 入参 | Parameters
   * @param {SessionData} params.session - 会话数据 | Session
   * @param {string} [params.prompt] - 文本提示 | Prompt
   * @param {'1:1'|'16:9'|'4:3'} [params.ratio] - 图片比例 | Ratio
   * @param {boolean} [params.useImagePrompt] - 是否使用会话 image_prompt | Use session image_prompt
   * @param {boolean} [params.updateAvatar] - 是否更新头像为生成图片 | Update avatar
   * @returns {Promise<{imageUrl:string;session:SessionData}>} 图片地址与会话 | Image URL and session
   */
  async handleGeneration(params: {
    session: SessionData;
    intent?: ImageIntent;
    avatarMood?: string;
    ratio?: '1:1' | '16:9' | '4:3';
    useImagePrompt?: boolean;
    updateAvatar?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<{ imageUrl: string; session: SessionData; avatar?: StoredAvatar }>
  {
    const intent = params.intent ?? 'avatar';
    const resolvedPrompt = this.resolvePrompt({
      session: params.session,
      intent,
      avatarMood: params.avatarMood,
      useImagePrompt: params.useImagePrompt
    });

    if (!resolvedPrompt) {
      throw new Error('Prompt is required for image generation');
    }

    const ratio = params.ratio ?? this.resolveDefaultRatio(intent);
    const imageUrl = await this.llmClient.generateImage({ prompt: resolvedPrompt, ratio });
    if (!imageUrl) {
      throw new Error('Image API returned empty payload');
    }
    let session = params.session;
    let storedAvatar: StoredAvatar | undefined;

    if (params.updateAvatar && imageUrl) {
      const statusLabel = this.resolveAvatarLabel(params.session, params.avatarMood);
      storedAvatar = await this.avatarService.createAvatar({
        characterId: params.session.characterId,
        statusLabel,
        imageUrl,
        metadata: {
          prompt: resolvedPrompt,
          ratio,
          useImagePrompt: params.useImagePrompt ?? false,
          intent,
          avatarMood: statusLabel,
          ...(params.metadata ?? {})
        }
      });
      session = await this.sessionService.updateAvatar(params.session.sessionId, {
        avatarId: storedAvatar.id,
        imageUrl: storedAvatar.imageUrl,
        statusLabel: storedAvatar.statusLabel
      });
    }

    session = await this.sessionService.attachImageToLastAssistantMessage(session.sessionId, {
      imageUrl,
      imagePrompt: resolvedPrompt
    });

    return { imageUrl, session, avatar: storedAvatar };
  }

  /**
   * 功能：查找会话中最新的助手 `imagePrompt`
   * Description: Find the latest assistant `imagePrompt` in session
   */
  private findLatestImagePrompt(session: SessionData): string | undefined {
    const reversed = [...session.messages].reverse();
    for (const message of reversed) {
      if (message.role === 'assistant' && message.imagePrompt) {
        return message.imagePrompt;
      }
    }
    return undefined;
  }

  private resolvePrompt(params: {
    session: SessionData;
    intent: ImageIntent;
    avatarMood?: string;
    useImagePrompt?: boolean;
  }): string | undefined {
    if (params.useImagePrompt) {
      const latest = this.findLatestImagePrompt(params.session);
      if (latest) {
        return latest;
      }
    }

    const profile = this.characterService.getCharacterOrThrow(params.session.characterId);
    return this.resolveConfiguredPrompt(profile, params.session, params.intent, params.avatarMood);
  }

  private resolveConfiguredPrompt(
    profile: CharacterProfile,
    session: SessionData,
    intent: ImageIntent,
    avatarMood?: string
  ): string {
    const prompts = intent === 'avatar' ? profile.imagePrompts?.avatar : profile.imagePrompts?.scene;
    const fallback = profile.imagePrompts?.fallback ?? this.buildStyleFallback(profile, session);
    if (!prompts || Object.keys(prompts).length === 0) {
      return fallback;
    }

    const normalizedMood = (avatarMood ?? session.characterState.avatarLabel ?? session.characterState.mode ?? 'default')
      .toString()
      .toLowerCase();

    return prompts[normalizedMood] ?? prompts.default ?? fallback;
  }

  private buildStyleFallback(profile: CharacterProfile, session: SessionData): string {
    const mode = session.characterState.mode?.toLowerCase() ?? 'neutral';
    return `${profile.name} portrait, ${profile.imageStyleGuidelines}, mood ${mode}`;
  }

  private resolveAvatarLabel(session: SessionData, explicit?: string): string {
    return explicit ?? session.characterState.avatarLabel ?? session.characterState.mode?.toLowerCase() ?? 'default';
  }

  private resolveDefaultRatio(intent: ImageIntent): '1:1' | '16:9' | '4:3' {
    return intent === 'scene' ? '16:9' : '1:1';
  }
}
