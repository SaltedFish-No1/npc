import { SessionService } from '../sessions/sessionService.js';
import { LLMClient } from '../../clients/llmClient.js';
import { SessionData } from '../../schemas/chat.js';

export class ImageService {
  constructor(
    private readonly llmClient: LLMClient,
    private readonly sessionService: SessionService
  ) {}

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
