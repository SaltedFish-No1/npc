/**
 * 文件：backend/src/clients/llmClient.ts
 * 功能描述：对接上游 LLM 文本/图片接口，含流式解析与健壮性处理 | Description: Upstream LLM client for text/image with streaming parsing and robustness
 * 作者：Haotian Chen  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖环境配置与 JSON 工具、Zod 模型
 */
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

/**
 * LLM 客户端：封装聊天与图片生成 API
 * LLMClient: Encapsulates chat and image generation APIs
 */
export class LLMClient {
  constructor(private readonly config: AppConfig) {}

  /**
   * 功能：创建非流式聊天补全
   * Description: Create non-stream chat completion
   * @param {ChatCompletionRequest} payload - 请求负载 | Request payload
   * @returns {Promise<AIResponse>} 解析后的 AI 响应 | Parsed AI response
   */
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

  /**
   * 功能：创建流式聊天补全，逐块解析 SSE 并聚合内容
   * Description: Create streaming chat completion, parse SSE blocks and aggregate content
   * @param {ChatCompletionRequest} payload - 请求负载 | Request payload
   * @param {(chunk:string)=>void} onChunk - 文本块回调 | Text chunk callback
   * @returns {Promise<AIResponse>} 解析后的 AI 响应 | Parsed AI response
   */
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

    /**
     * 复杂算法：SSE 事件块解析
     * 中文：解析 `data:` 行，分辨 `delta.content` 与 `reasoning_content`，聚合最终内容并保留回退
     * English: Parse `data:` lines, distinguish `delta.content` vs `reasoning_content`, aggregate content with fallback
     */
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

  /**
   * 功能：生成图片并返回 URL
   * Description: Generate image and return URL
   * @param {ImageGenerationRequest} payload - 请求负载 | Request payload
   * @returns {Promise<string>} 图片地址 | Image URL
   */
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

  /**
   * 功能：生成文本嵌入向量
   * Description: Create embedding vector for input text
   */
  async createEmbedding(input: string): Promise<number[]> {
    if (this.config.MOCK_LLM_RESPONSES) {
      // 生成固定长度的随机嵌入用于本地测试
      return Array.from({ length: this.config.EMBEDDING_DIM }, () => Math.random());
    }
    const model = this.config.EMBEDDING_MODEL_NAME ?? 'text-embedding-3-large';
    const response = await fetch(`${this.config.LLM_API_BASE}/embeddings`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({ model, input })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embeddings API error: ${errText}`);
    }
    const data = await response.json();
    const vector = data.data?.[0]?.embedding;
    if (!Array.isArray(vector)) throw new Error('Invalid embedding payload');
    return vector as number[];
  }

  /**
   * 功能：构建上游 API 请求头
   * Description: Build upstream API headers
   */
  private buildHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.LLM_API_KEY}`
    };
  }

  /**
   * 非常规处理：AI 响应解析与清洗
   * 中文：去除三引号代码块、规范化正号数字，Zod 校验失败直接报错
   * English: Trim code fences, normalize plus-sign numbers, validate with Zod or throw
   */
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

  /**
   * 功能：返回模拟聊天响应（用于本地或测试）
   * Description: Return a mock chat response for local/testing
   */
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
