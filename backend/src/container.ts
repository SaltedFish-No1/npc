/**
 * 文件：backend/src/container.ts
 * 功能描述：应用依赖装配与上下文构建（服务实例化、资源路径解析） | Description: Build application context by wiring up services and resolving resource paths
 * 作者：NPC 项目组  ·  版本：v1.0.0
 * 创建日期：2025-11-24  ·  最后修改：2025-11-24
 * 依赖说明：依赖各服务与客户端类；被服务器创建流程调用
 */
import path from 'node:path';

import { AppConfig } from './config/env.js';
import { CharacterService } from './services/characters/characterService.js';
import { InMemorySessionStore } from './services/sessions/inMemorySessionStore.js';
import { SessionService } from './services/sessions/sessionService.js';
import { PromptEngine } from './services/prompt/promptEngine.js';
import { LLMClient } from './clients/llmClient.js';
import { ChatService } from './services/chat/chatService.js';
import { ImageService } from './services/image/imageService.js';

export type AppContext = {
  config: AppConfig;
  services: {
    characters: CharacterService;
    sessions: SessionService;
    prompt: PromptEngine;
    chat: ChatService;
    image: ImageService;
    llm: LLMClient;
  };
};

/**
 * 功能：装配并返回应用上下文（服务与配置）
 * Description: Wire up services/clients and return contextual dependencies for the app
 * @param {AppConfig} config - 应用配置 | Application configuration
 * @returns {AppContext} 应用上下文 | Application context
 */
export const buildAppContext = (config: AppConfig): AppContext => {
  const baseDir = process.cwd();
  const characterService = new CharacterService(path.resolve(baseDir, 'config/characters'));
  // 非常规处理：内存会话存储设置 2 小时 TTL，用于自动过期与资源回收 | Set 2h TTL for in-memory session store for auto-expiry
  const sessionStore = new InMemorySessionStore(1000 * 60 * 60 * 2); // 2h TTL
  const sessionService = new SessionService(sessionStore, characterService);
  const promptEngine = new PromptEngine(path.resolve(baseDir, 'templates/prompts'));
  const llmClient = new LLMClient(config);
  const chatService = new ChatService(promptEngine, sessionService, characterService, llmClient);
  const imageService = new ImageService(llmClient, sessionService);

  return {
    config,
    services: {
      characters: characterService,
      sessions: sessionService,
      prompt: promptEngine,
      chat: chatService,
      image: imageService,
      llm: llmClient
    }
  };
};
