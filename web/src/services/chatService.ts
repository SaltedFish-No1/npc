import { z } from 'zod';

import { NPC_API_BASE_URL, NPC_API_KEY } from '@/config/constants';
import {
  ChatTurnResponse,
  chatTurnResponseSchema,
  imageGenerationResponseSchema,
  ImageGenerationResponse,
  sessionSchema,
  SessionData,
  characterStateSchema,
  chatMessageSchema
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

  const data = await response.json();
  return schema.parse(data);
};

export const fetchCharacters = async (params?: {
  languageCode?: string;
  signal?: AbortSignal;
}): Promise<CharacterSummary[]> => {
  const query = params?.languageCode ? `?languageCode=${encodeURIComponent(params.languageCode)}` : '';
  return performJsonRequest(`/api/characters${query}`, z.array(characterSummarySchema), {
    method: 'GET',
    signal: params?.signal
  });
};

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

type StreamChatParams = {
  sessionId?: string;
  characterId: string;
  languageCode?: string;
  message: string;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
};

export const streamChatCompletion = async (
  params: StreamChatParams
): Promise<ChatTurnResponse> => {
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
    buffer = events.pop() || '';
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

export const generateImage = async (params: {
  sessionId?: string;
  characterId: string;
  prompt?: string;
  ratio?: '1:1' | '16:9' | '4:3';
  useImagePrompt?: boolean;
  updateAvatar?: boolean;
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
      updateAvatar: params.updateAvatar
    }),
    signal: params?.signal
  });
};
