/**
 * 文件：backend/src/services/image/imageService.ts
 * 功能描述：图片生成服务，支持使用最新 image_prompt 并可更新头像 | Description: Image generation service that can use latest image_prompt and update avatar
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 LLMClient 与 SessionService
 */
import { SessionService } from '../sessions/sessionService.js';
import { LLMClient } from '../../clients/llmClient.js';
import { SessionData } from '../../schemas/chat.js';

/**
 * 图片服务：封装图片生成与会话头像更新
 * ImageService: Encapsulates image generation and session avatar update
 */
export class ImageService {
  constructor(
    private readonly llmClient: LLMClient,
    private readonly sessionService: SessionService
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
    prompt?: string;
    ratio?: '1:1' | '16:9' | '4:3';
    useImagePrompt?: boolean;
    updateAvatar?: boolean;
  }): Promise<{ imageUrl: string; session: SessionData }>
  {
    const prompt = params.useImagePrompt
      ? this.findLatestImagePrompt(params.session) ?? params.prompt
      : params.prompt;

    if (!prompt) {
      throw new Error('Prompt is required for image generation');
    }

    const imageUrl = await this.llmClient.generateImage({ prompt, ratio: params.ratio });
    if (!imageUrl) {
      throw new Error('Image API returned empty payload');
    }
    let session = params.session;

    if (params.updateAvatar && imageUrl) {
      session = await this.sessionService.updateAvatar(params.session.sessionId, imageUrl);
    }

    return { imageUrl, session };
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
}
