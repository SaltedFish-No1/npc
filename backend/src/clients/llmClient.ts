import { TextDecoder } from 'node:util';

import { AppConfig } from '../config/env.js';
import { AIResponse, aiResponseSchema } from '../schemas/chat.js';
import { normalizeJsonNumbers, trimCodeFence } from '../utils/json.js';

export type ChatCompletionRequest = {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  stream?: boolean;
};

export type ImageGenerationRequest = {
  prompt: string;
  ratio?: '1:1' | '16:9' | '4:3';
};

const SIZE_MAP: Record<string, string> = {
  '1:1': '2048x2048',
  '16:9': '2560x1440',
  '4:3': '2304x1728'
};

export class LLMClient {
  constructor(private readonly config: AppConfig) {}

  async createChatCompletion(payload: ChatCompletionRequest): Promise<AIResponse> {
    if (this.config.MOCK_LLM_RESPONSES) {
      return this.mockChatResponse();
    }

    const response = await fetch(`${this.config.LLM_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.config.TEXT_MODEL_NAME,
        temperature: payload.temperature ?? 0.8,
        stream: false,
        messages: [{ role: 'system', content: payload.systemPrompt }, ...payload.messages]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Chat API error: ${errText}`);
    }

    const data = await response.json();
    return this.parseAiResponse(data.choices?.[0]?.message?.content);
  }

  async createChatCompletionStream(
    payload: ChatCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    if (this.config.MOCK_LLM_RESPONSES) {
      const mock = this.mockChatResponse();
      onChunk(mock.response);
      return mock;
    }

    const response = await fetch(`${this.config.LLM_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.config.TEXT_MODEL_NAME,
        temperature: payload.temperature ?? 0.8,
        stream: true,
        messages: [{ role: 'system', content: payload.systemPrompt }, ...payload.messages]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Chat API error: ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Streaming not supported in this environment');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let aggregated = '';
    let fallback: string | null = null;
    let doneStreaming = false;

    const processEvent = (eventBlock: string) => {
      const lines = eventBlock.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payloadLine = line.replace(/^data:\s*/, '');
        if (!payloadLine) continue;
        if (payloadLine === '[DONE]') {
          doneStreaming = true;
          return;
        }
        try {
          const json = JSON.parse(payloadLine);
          const choice = json.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta ?? {};
          const chunk =
            typeof delta.content === 'string' && delta.content.length > 0
              ? delta.content
              : typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0
                ? delta.reasoning_content
                : '';
          if (chunk) {
            onChunk(chunk);
          }
          if (typeof delta.content === 'string') {
            aggregated += delta.content;
          }
          if (typeof choice.message?.content === 'string' && choice.message.content.length > 0) {
            fallback = choice.message.content;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
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
      buffer = events.pop() ?? '';
      for (const event of events) {
        processEvent(event.trim());
        if (doneStreaming) break;
      }
    }

    if (!doneStreaming && buffer.trim()) {
      processEvent(buffer.trim());
    }

    const raw = aggregated || fallback || '';
    if (!raw) {
      throw new Error('Streaming API returned no content');
    }
    return this.parseAiResponse(raw);
  }

  async generateImage(payload: ImageGenerationRequest): Promise<string> {
    if (this.config.MOCK_LLM_RESPONSES) {
      return 'https://images.example.com/mock-image.png';
    }

    const response = await fetch(`${this.config.LLM_API_BASE}/images/generations`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.config.IMG_MODEL_NAME,
        prompt: payload.prompt,
        size: SIZE_MAP[payload.ratio ?? '1:1'] ?? SIZE_MAP['1:1'],
        response_format: 'url',
        sequential_image_generation: 'disabled'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Image API error: ${errText}`);
    }

    const data = await response.json();
    return data.data?.[0]?.url ?? '';
  }

  private buildHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.LLM_API_KEY}`
    };
  }

  private parseAiResponse(rawContent?: string): AIResponse {
    const cleaned = trimCodeFence(rawContent ?? '');
    if (!cleaned) {
      throw new Error('AI response missing content');
    }
    const normalized = normalizeJsonNumbers(cleaned);
    const parsed = aiResponseSchema.safeParse(JSON.parse(normalized || '{}'));
    if (!parsed.success) {
      throw new Error('AI response validation failed');
    }
    return parsed.data;
  }

  private mockChatResponse(): AIResponse {
    return {
      thought: 'Mocking thoughtful response',
      stress_change: Math.random() * 2 - 1,
      trust_change: Math.random() * 2 - 1,
      response: 'This is a mock response used while MOCK_LLM_RESPONSES=true.',
      image_prompt: 'Soft watercolor portrait of a calm esper in a city park.'
    };
  }
}
