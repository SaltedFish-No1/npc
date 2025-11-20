import { API_BASE_URL, IMG_MODEL_NAME, TEXT_MODEL_NAME } from '@/config/constants';
import { AIResponse, aiResponseSchema } from '@/schemas/chat';

const trimCodeFence = (text: string) =>
  text.replace(/```json/gi, '').replace(/```/g, '').trim();

const normalizeJsonNumbers = (text: string) =>
  text.replace(/(:\s*)\+(\d+(?:\.\d+)?)/g, '$1$2');

export const requestChatCompletion = async (params: {
  apiKey: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
}): Promise<AIResponse> => {
  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`
    },
    credentials: 'omit',
    body: JSON.stringify({
      model: TEXT_MODEL_NAME,
      messages: [{ role: 'system', content: params.systemPrompt }, ...params.messages],
      temperature: 0.8,
      stream: false
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Chat API Error: ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '{}';
  const parsed = aiResponseSchema.safeParse(JSON.parse(normalizeJsonNumbers(trimCodeFence(rawContent))));
  if (!parsed.success) {
    throw new Error('AI response validation failed');
  }
  return parsed.data;
};

export const streamChatCompletion = async (params: {
  apiKey: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  onChunk?: (chunk: string) => void;
}): Promise<AIResponse> => {
  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`
    },
    credentials: 'omit',
    body: JSON.stringify({
      model: TEXT_MODEL_NAME,
      messages: [{ role: 'system', content: params.systemPrompt }, ...params.messages],
      temperature: 0.8,
      stream: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Chat API Error: ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Streaming not supported in this environment');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let aggregatedContent = '';
  let fallbackMessage: string | null = null;
  let doneStreaming = false;

  const processEvent = (eventBlock: string) => {
    const lines = eventBlock.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.replace(/^data:\s*/, '');
      if (!payload) continue;
      if (payload === '[DONE]') {
        doneStreaming = true;
        return;
      }

      try {
        const json = JSON.parse(payload);
        const choice = json.choices?.[0];
        if (!choice) return;
        const delta = choice.delta ?? {};

        const contentChunk =
          typeof delta.content === 'string' && delta.content.length > 0
            ? delta.content
            : typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0
              ? delta.reasoning_content
              : '';

        if (contentChunk) {
          params.onChunk?.(contentChunk);
        }

        if (typeof delta.content === 'string' && delta.content.length > 0) {
          aggregatedContent += delta.content;
        }

        if (typeof choice.message?.content === 'string' && choice.message.content.length > 0) {
          fallbackMessage = choice.message.content;
        }
      } catch (error) {
        console.warn('Failed to parse streaming chunk', error);
      }
    }
  };

  while (!doneStreaming) {
    const { done, value } = await reader.read();
    if (done) {
      doneStreaming = true;
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const event of events) {
      processEvent(event.trim());
      if (doneStreaming) break;
    }
  }

  if (!doneStreaming && buffer.trim()) {
    processEvent(buffer.trim());
  }

  const finalRaw = trimCodeFence(aggregatedContent || fallbackMessage || '');
  if (!finalRaw) {
    throw new Error('Streaming API returned no content');
  }

  const parsed = aiResponseSchema.safeParse(JSON.parse(normalizeJsonNumbers(finalRaw)));
  if (!parsed.success) {
    throw new Error('AI response validation failed');
  }
  return parsed.data;
};

export const generateImage = async (params: {
  apiKey: string;
  prompt: string;
  ratio?: '1:1' | '16:9' | '4:3';
}): Promise<string | null> => {
  const sizeMap: Record<string, string> = {
    '1:1': '2048x2048',
    '16:9': '2560x1440',
    '4:3': '2304x1728'
  };

  const response = await fetch(`${API_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`
    },
    credentials: 'omit',
    body: JSON.stringify({
      model: IMG_MODEL_NAME,
      prompt: params.prompt,
      size: sizeMap[params.ratio || '1:1'] || '2048x2048',
      response_format: 'url',
      sequential_image_generation: 'disabled'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Image API Error: ${errText}`);
  }

  const data = await response.json();
  const url = data.data?.[0]?.url;
  return url || null;
};
