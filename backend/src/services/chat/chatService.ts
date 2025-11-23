import { PromptEngine } from '../prompt/promptEngine.js';
import { SessionService } from '../sessions/sessionService.js';
import { LLMClient } from '../../clients/llmClient.js';
import { CharacterService } from '../characters/characterService.js';
import { AIResponse, ChatMessage, SessionData } from '../../schemas/chat.js';

const HISTORY_WINDOW = 10;

export class ChatService {
  constructor(
    private readonly promptEngine: PromptEngine,
    private readonly sessionService: SessionService,
    private readonly characterService: CharacterService,
    private readonly llmClient: LLMClient
  ) {}

  async handleTurn(params: {
    session: SessionData;
    incomingMessages: ChatMessage[];
    stream?: boolean;
    onChunk?: (chunk: string) => void;
  }): Promise<{ session: SessionData; assistantMessage: ChatMessage; ai: AIResponse }>
  {
    const latestUserMessage = params.incomingMessages.filter((msg) => msg.role === 'user').pop();
    if (!latestUserMessage) {
      throw new Error('At least one user message is required');
    }

    const profile = this.characterService.getCharacterOrThrow(params.session.characterId);
    const systemPrompt = this.promptEngine.buildSystemPrompt({
      character: profile,
      state: params.session.characterState,
      languageCode: params.session.languageCode
    });

    const history = params.session.messages
      .slice(-HISTORY_WINDOW)
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

    const completionPayload = {
      systemPrompt,
      messages: [...history, { role: 'user' as const, content: latestUserMessage.content }]
    };

    const aiResponse = params.stream
      ? await this.llmClient.createChatCompletionStream(completionPayload, params.onChunk ?? (() => {}))
      : await this.llmClient.createChatCompletion(completionPayload);

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse.response,
      thought: aiResponse.thought,
      stressChange: aiResponse.stress_change,
      trustChange: aiResponse.trust_change,
      currentStress: clamp(params.session.characterState.stress + aiResponse.stress_change),
      imagePrompt: aiResponse.image_prompt
    };

    const updatedState = {
      ...params.session.characterState,
      stress: clamp(params.session.characterState.stress + aiResponse.stress_change),
      trust: clamp(params.session.characterState.trust + aiResponse.trust_change),
      mode: resolveMode(params.session.characterState.stress + aiResponse.stress_change)
    };

    const updatedSession = await this.sessionService.appendTurn(params.session.sessionId, {
      userMessage: latestUserMessage,
      assistantMessage,
      characterState: updatedState
    });

    return {
      session: updatedSession,
      assistantMessage,
      ai: aiResponse
    };
  }
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));

const resolveMode = (stress: number): 'NORMAL' | 'ELEVATED' | 'BROKEN' => {
  if (stress >= 99) return 'BROKEN';
  if (stress >= 70) return 'ELEVATED';
  return 'NORMAL';
};
