/**
 * 文件：web/src/services/chatService.ts
 * 功能描述：前端 NPC 后端接口封装，含角色、聊天SSE与图片生成 | Description: Frontend service wrapping NPC backend APIs for characters, chat SSE and image generation
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖常量与 Zod 模型
 */
import { z } from 'zod';

import { NPC_API_BASE_URL, NPC_API_KEY } from '@/config/constants';
import {
  ChatTurnResponse,
  chatTurnResponseSchema,
  imageGenerationResponseSchema,
  sessionSchema,
  SessionData,
  characterStateSchema,
  chatMessageSchema,
  ChatMessage
} from '@/schemas/chat';
import { unifiedCharacterModelSchema } from '@/schemas/character';

const activationResponseSchema = z.object({
  sessionId: z.string(),
  characterId: z.string(),
  languageCode: z.string(),
  characterState: characterStateSchema,
  characterModel: unifiedCharacterModelSchema.optional(),
  initialMessages: z.array(chatMessageSchema)
});

const characterSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  codename: z.string(),
  avatarUrl: z.string().url().optional(),
  languages: z.array(z.string()),
  capabilities: z.object({
    text: z.boolean(),
    image: z.boolean()
  })
});

export type CharacterSummary = z.infer<typeof characterSummarySchema>;

const messageHistoryResponseSchema = z.object({
  items: z.array(chatMessageSchema),
  nextCursor: z.string().nullable()
});

const trimmedBase = NPC_API_BASE_URL.replace(/\/+$/, '');

const assertBackendConfigured = () => {
  if (!NPC_API_KEY) {
    throw new Error('Missing NPC backend API key. Set VITE_NPC_API_KEY in your env.');
  }
};

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}`;
};

const performJsonRequest = async <T>(
  path: string,
  schema: z.ZodSchema<T>,
  init: RequestInit = {}
): Promise<T> => {
  assertBackendConfigured();
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': NPC_API_KEY,
      ...(init.headers ?? {})
    },
    credentials: 'omit'
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `NPC backend error ${response.status}: ${errorText || response.statusText || 'Unknown error'}`
    );
  }

  const data = (await response.json()) as unknown;
  return schema.parse(data);
};

/**
 * 功能：获取角色列表，支持按语言过滤
 * Description: Fetch character list with optional language filtering
 */
export const fetchCharacters = async (params?: {
  languageCode?: string;
  signal?: AbortSignal;
}): Promise<CharacterSummary[]> => {
  const query = params?.languageCode
    ? `?languageCode=${encodeURIComponent(params.languageCode)}`
    : '';
  return performJsonRequest(`/api/characters${query}`, z.array(characterSummarySchema), {
    method: 'GET',
    signal: params?.signal
  });
};

/**
 * 功能：激活角色并创建/复用会话
 * Description: Activate character and create/reuse session
 */
export const activateCharacterSession = async (params: {
  characterId: string;
  sessionId?: string;
  languageCode?: string;
  signal?: AbortSignal;
}): Promise<SessionData> => {
  const payload = await performJsonRequest(
    `/api/characters/${params.characterId}/activate`,
    activationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify({
        sessionId: params.sessionId,
        languageCode: params.languageCode
      }),
      signal: params?.signal
    }
  );

  return sessionSchema.parse({
    sessionId: payload.sessionId,
    characterId: payload.characterId,
    languageCode: payload.languageCode,
    characterModel: payload.characterModel,
    characterState: payload.characterState,
    messages: payload.initialMessages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  });
};

/** SSE 事件说明：chunk（文本片段）、final（最终payload）、end（结束） */
type StreamChatParams = {
  sessionId?: string;
  characterId: string;
  languageCode?: string;
  message: string;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
};

/**
 * 功能：以 SSE 流式发送聊天请求并处理事件
 * Description: Send chat via SSE and handle events
 */
export const streamChatCompletion = async (params: StreamChatParams): Promise<ChatTurnResponse> => {
  assertBackendConfigured();

  const response = await fetch(buildApiUrl('/api/npc/chat/stream'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'x-api-key': NPC_API_KEY
    },
    credentials: 'omit',
    body: JSON.stringify({
      sessionId: params.sessionId,
      characterId: params.characterId,
      languageCode: params.languageCode,
      messages: [{ role: 'user', content: params.message }],
      stream: true
    }),
    signal: params.signal
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `NPC backend stream error ${response.status}: ${errorText || response.statusText || 'Unknown error'}`
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Streaming is not supported in this browser');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let streamClosed = false;
  let finalPayload: ChatTurnResponse | null = null;

  const handleEventBlock = (block: string) => {
    if (!block.trim()) return;
    const lines = block.split('\n');
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.replace(/^event:\s*/, '');
      } else if (line.startsWith('data:')) {
        dataLines.push(line.replace(/^data:\s*/, ''));
      }
    }
    const data = dataLines.join('\n');
    switch (eventName) {
      case 'chunk':
        if (data) params.onChunk?.(data);
        break;
      case 'final':
        if (data) {
          const parsed = chatTurnResponseSchema.safeParse(JSON.parse(data));
          if (!parsed.success) {
            throw new Error('Invalid final payload from NPC backend');
          }
          finalPayload = parsed.data;
        }
        break;
      case 'error':
        throw new Error(data || 'NPC backend stream reported an error');
      case 'end':
        streamClosed = true;
        break;
      default:
        break;
    }
  };

  while (!streamClosed) {
    const { done, value } = await reader.read();
    if (done) {
      streamClosed = true;
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const evt of events) {
      handleEventBlock(evt);
      if (streamClosed) break;
    }
  }

  if (!streamClosed && buffer.trim()) {
    handleEventBlock(buffer.trim());
  }

  if (!finalPayload) {
    throw new Error('Stream ended without a final payload from NPC backend');
  }

  return finalPayload;
};

/**
 * 功能：分页获取后台会话消息
 * Description: Fetch paginated session history with cursor support
 */
export const fetchSessionMessages = async (params: {
  sessionId: string;
  limit?: number;
  cursor?: string | null;
  signal?: AbortSignal;
}): Promise<{ items: ChatMessage[]; nextCursor: string | null }> => {
  const search = new URLSearchParams();
  search.set('limit', String(params.limit ?? 50));
  if (params.cursor) {
    search.set('cursor', params.cursor);
  }

  return performJsonRequest(
    `/api/npc/sessions/${params.sessionId}/messages?${search.toString()}`,
    messageHistoryResponseSchema,
    {
      method: 'GET',
      signal: params.signal
    }
  );
};

/**
 * 功能：触发图片生成（可选：使用会话 image_prompt、更新头像）
 * Description: Trigger image generation (optional: use session image_prompt, update avatar)
 */
export const generateImage = async (params: {
  sessionId?: string;
  characterId: string;
  prompt?: string;
  ratio?: '1:1' | '16:9' | '4:3';
  useImagePrompt?: boolean;
  updateAvatar?: boolean;
  statusLabel?: string;
  metadata?: Record<string, unknown>;
  signal?: AbortSignal;
}) => {
  return performJsonRequest('/api/npc/images', imageGenerationResponseSchema, {
    method: 'POST',
    body: JSON.stringify({
      sessionId: params.sessionId,
      characterId: params.characterId,
      prompt: params.prompt,
      ratio: params.ratio,
      useImagePrompt: params.useImagePrompt,
      updateAvatar: params.updateAvatar,
      statusLabel: params.statusLabel,
      metadata: params.metadata
    }),
    signal: params?.signal
  });
};
