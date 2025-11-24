/**
 * 文件：backend/src/services/chat/chatService.ts
 * 功能描述：单次对话处理服务，负责提示词构建、历史截取、LLM 调用与会话更新 | Description: Handles a chat turn: builds system prompt, slices history, calls LLM, updates session
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖 PromptEngine、SessionService、CharacterService、LLMClient 与 Zod 模型
 */
import { PromptEngine } from '../prompt/promptEngine.js';
import { SessionService } from '../sessions/sessionService.js';
import { LLMClient } from '../../clients/llmClient.js';
import { CharacterService, type CharacterProfile } from '../characters/characterService.js';
import { AIResponse, ChatMessage, SessionData, type CharacterState } from '../../schemas/chat.js';
import type { DigitalPersonaRuntimePatch, DigitalPersonaRuntimeState } from '../../schemas/persona.js';
import { MemoryService } from '../memory/memoryService.js';
import { AvatarService } from '../avatars/avatarService.js';

/**
 * 历史窗口大小：仅保留最近 10 条用户/助手消息用于上下文
 * History window size: keep last 10 user/assistant messages for context
 */
const HISTORY_WINDOW = 10;

/**
 * 聊天服务：封装单轮对话的业务流程
 * ChatService: Encapsulates one-turn chat business flow
 */
export class ChatService {
  constructor(
    private readonly promptEngine: PromptEngine,
    private readonly sessionService: SessionService,
    private readonly characterService: CharacterService,
    private readonly llmClient: LLMClient,
    private readonly avatarService: AvatarService,
    private readonly memoryService?: MemoryService
  ) {}

  /**
   * 功能：处理一次对话并返回助手消息与AI原始响应
   * Description: Handle a chat turn and return assistant message with raw AI response
   * @param {Object} params - 入参 | Parameters
   * @param {SessionData} params.session - 当前会话 | Current session
   * @param {ChatMessage[]} params.incomingMessages - 新进消息（至少包含一条 user） | Incoming messages (at least one user)
   * @param {boolean} [params.stream] - 是否流式输出 | Stream SSE output
   * @param {(chunk:string)=>void} [params.onChunk] - 流式输出回调 | SSE chunk callback
   * @returns {Promise<{ session: SessionData; assistantMessage: ChatMessage; ai: AIResponse }>} 更新后的会话、助手消息与AI响应 | Updated session, assistant message and AI response
   */
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
      languageCode: params.session.languageCode,
      personaRuntime: params.session.personaRuntime ?? profile.persona?.runtime_state
    });

    // 检索长期记忆并注入系统提示
    let augmentedSystemPrompt = systemPrompt;
    if (this.memoryService) {
      const memories = await this.memoryService.searchByQuery(
        params.session.characterId,
        latestUserMessage.content
      );
      if (memories.length) {
        const bullets = memories.map((m) => `- (${m.type}) ${m.content}`).join('\n');
        augmentedSystemPrompt = `${systemPrompt}\n\n[Long-term memories]\n${bullets}`;
      }
    }

    // 复杂算法：历史截取与角色过滤
    // 中文：仅保留最近 N 条且角色为 user/assistant 的消息，保证上下文相关性与长度控制
    // English: Keep last N messages with role user/assistant to control context length and relevance
    const history = params.session.messages
      .slice(-HISTORY_WINDOW)
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

    const completionPayload = {
      systemPrompt: augmentedSystemPrompt,
      messages: [...history, { role: 'user' as const, content: latestUserMessage.content }]
    };

    type MaybeFallbackAIResponse = AIResponse & { __fallback?: boolean };
    const aiResponse = (params.stream
      ? await this.llmClient.createChatCompletionStream(
          completionPayload,
          params.onChunk ?? (() => {})
        )
      : await this.llmClient.createChatCompletion(completionPayload)) as MaybeFallbackAIResponse;

    const isFallback = Boolean(aiResponse.__fallback);
    const stressDelta = isFallback ? 0 : aiResponse.stress_change;
    const trustDelta = isFallback ? 0 : aiResponse.trust_change;
    const nextStressSnapshot = clamp(params.session.characterState.stress + stressDelta);

    // 业务规则：根据 AI 的 stress/trust 改变量更新角色状态，并保留思考与图片提示
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse.response,
      thought: isFallback ? undefined : aiResponse.thought,
      stressChange: isFallback ? undefined : aiResponse.stress_change,
      trustChange: isFallback ? undefined : aiResponse.trust_change,
      currentStress: isFallback ? params.session.characterState.stress : nextStressSnapshot,
      imagePrompt: aiResponse.image_prompt
    };

    let updatedState = {
      ...params.session.characterState,
      stress: clamp(params.session.characterState.stress + stressDelta),
      trust: clamp(params.session.characterState.trust + trustDelta),
      mode: resolveMode(params.session.characterState.stress + stressDelta)
    };

    // 自动切换头像：尝试查找对应当前模式的最新头像
    // Automatic avatar switching: try to find latest avatar for current mode
    const oldMode = params.session.characterState.mode;
    const newMode = updatedState.mode;
    
    if (oldMode !== newMode) {
      const targetLabel = newMode.toLowerCase();
      const existingAvatar = await this.avatarService.findLatestAvatarByLabel(
        params.session.characterId,
        targetLabel
      );

      if (existingAvatar) {
        updatedState = {
          ...updatedState,
          avatarId: existingAvatar.id,
          avatarLabel: existingAvatar.statusLabel,
          avatarUrl: existingAvatar.imageUrl
        };
      } else {
        // 如果没有找到新模式的头像，且当前头像属于旧模式，则重置（让前端使用默认占位符）
        // If no avatar found for new mode, and current avatar belongs to old mode, reset (let frontend use fallback)
        if (updatedState.avatarLabel === oldMode.toLowerCase()) {
          updatedState = {
            ...updatedState,
            avatarId: undefined,
            avatarLabel: undefined,
            avatarUrl: undefined
          };
        }
      }
    }

    const personaPatch = this.buildPersonaRuntimePatch({
      session: params.session,
      profile,
      updatedState,
      latestUserMessage,
      ai: aiResponse
    });

    const updatedSession = await this.sessionService.appendTurn(params.session.sessionId, {
      userMessage: latestUserMessage,
      assistantMessage,
      characterState: updatedState,
      personaPatch
    });

    // 将本次对话生成记忆（启发式），并写入嵌入
    if (this.memoryService) {
      const importance = Math.min(10, Math.max(1, Math.round(Math.abs(aiResponse.stress_change + aiResponse.trust_change) * 5)));
      const contentForMemory = aiResponse.thought?.trim() || aiResponse.response.trim();
      if (contentForMemory.length > 0) {
        const id = `${updatedSession.characterId}:${updatedSession.sessionId}:${updatedSession.version}`;
        await this.memoryService.createEntry({
          id,
          characterId: updatedSession.characterId,
          sessionId: updatedSession.sessionId,
          type: 'INSIGHT',
          content: contentForMemory,
          importance,
          createdAt: Date.now()
        });
        await this.memoryService.upsertEmbedding(id, contentForMemory);
      }
    }

    return {
      session: updatedSession,
      assistantMessage,
      ai: aiResponse
    };
  }

  /**
   * 功能：依据当前会话上下文构建 DigitalPersona 运行态增量
   * Description: Build a DigitalPersonaRuntimePatch using latest stress values, timestamp and triggers
   */
  private buildPersonaRuntimePatch(params: {
    session: SessionData;
    profile: CharacterProfile;
    updatedState: CharacterState;
    latestUserMessage: ChatMessage;
    ai: AIResponse;
  }): DigitalPersonaRuntimePatch | undefined {
    const persona = params.profile.persona;
    if (!params.session.personaId && !persona) return undefined;
    const runtime: DigitalPersonaRuntimeState | undefined = params.session.personaRuntime ?? persona?.runtime_state;
    if (!runtime) return undefined;

    const patch: DigitalPersonaRuntimePatch = {};
    const now = new Date();
    patch.temporal_status = {
      current_date: now.toISOString()
    };
    const dob = persona?.static_profile.physiology.date_of_birth;
    const age = dob ? calculateAge(dob, now) : undefined;
    if (typeof age === 'number') {
      patch.temporal_status.calculated_age = age;
    }

    const stressMeter: DigitalPersonaRuntimePatch['stress_meter'] = {
      current_level: Math.round(params.updatedState.stress)
    };
    const triggers = computeActiveTriggers(
      runtime.stress_meter?.active_triggers,
      params.ai.stress_change,
      params.latestUserMessage
    );
    if (triggers) {
      stressMeter.active_triggers = triggers;
    }
    patch.stress_meter = stressMeter;

    if (!Object.keys(patch.temporal_status ?? {}).length) {
      delete patch.temporal_status;
    }
    if (!Object.keys(patch.stress_meter ?? {}).length) {
      delete patch.stress_meter;
    }

    return Object.keys(patch).length ? patch : undefined;
  }
}

/**
 * 功能：将数值钳制到 [0,100]，并四舍五入到两位小数
 * Description: Clamp a number to [0,100] and round to 2 decimals
 * @param {number} value - 输入值 | Input value
 * @returns {number} 钳制后的值 | Clamped value
 */
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));

/**
 * 功能：根据压力值解析角色模式（阈值：99/70）
 * Description: Resolve character mode by stress thresholds (99/70)
 * @param {number} stress - 压力值 | Stress value
 * @returns {'NORMAL'|'ELEVATED'|'BROKEN'} 角色模式 | Character mode
 */
const resolveMode = (stress: number): 'NORMAL' | 'ELEVATED' | 'BROKEN' => {
  if (stress >= 99) return 'BROKEN';
  if (stress >= 70) return 'ELEVATED';
  return 'NORMAL';
};

/**
 * 功能：根据出生日期计算当前年龄（按 UTC，自然年）
 * Description: Calculate persona age from DOB and current date (UTC based)
 */
const calculateAge = (dob: string, now: Date): number | undefined => {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
};

/**
 * 功能：根据压力变化更新 active_triggers 列表
 * Description: Maintain stress triggers list with recent user inputs when stress increases
 */
const computeActiveTriggers = (
  existing: string[] | undefined,
  stressChange: number,
  latestUserMessage: ChatMessage
): string[] | undefined => {
  const base = Array.isArray(existing) ? existing.filter(Boolean).slice(-4) : [];
  if (stressChange > 0) {
    const snippet = latestUserMessage.content?.trim().replace(/\s+/g, ' ').slice(0, 48) ?? '';
    const label = snippet ? `User: ${snippet}` : 'User input spike';
    const withoutDup = base.filter((item) => item !== label);
    const merged = [...withoutDup, label];
    return merged.slice(-5);
  }
  if (stressChange < 0 && base.length) {
    return base.slice(1);
  }
  return base.length ? base : undefined;
};
