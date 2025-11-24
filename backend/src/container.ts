/**
 * 文件：backend/src/container.ts
 * 功能描述：应用依赖装配与上下文构建（服务实例化、资源路径解析） | Description: Build application context by wiring up services and resolving resource paths
 * 作者：Haotian Chen  ·  版本：v1.0.0
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
import { createDBClient } from './db/dbClient.js';
import { DatabaseSessionStore } from './services/sessions/databaseSessionStore.js';
import { createSessionCache } from './cache/sessionCache.js';
import { MemoryService } from './services/memory/memoryService.js';

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
  // 选择会话存储策略：database 优先，其次 memory 作为降级
  let sessionStore: SessionStoreLike;
  const useDatabase = config.SESSION_STORAGE_STRATEGY === 'database';
  if (useDatabase) {
    // 创建并缓存到全局，避免重复连接
    if (!(globalThis as any).__npc_db) {
      (globalThis as any).__npc_db = (createDBClient as any)(config);
    }
    sessionStore = new DatabaseSessionStoreSync(config);
  } else {
    // 内存存储（2h TTL）
    sessionStore = new InMemorySessionStore(1000 * 60 * 60 * 2);
  }
  const sessionService = new SessionService(sessionStore as any, characterService, syncCreateCache(config));
  const promptEngine = new PromptEngine(path.resolve(baseDir, 'templates/prompts'));
  const llmClient = new LLMClient(config);
  const memoryService = new MemoryService(config, syncGetDB(), llmClient);
  const chatService = new ChatService(promptEngine, sessionService, characterService, llmClient, memoryService);
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

// 适配器：在容器同步构建期间将异步 DB 客户端封装为同步 SessionStore
type SessionStoreLike = any;

class DatabaseSessionStoreSync {
  private impl: DatabaseSessionStore | null = null;
  constructor(private readonly config: AppConfig) {}
  private async ensure() {
    if (!this.impl) {
      const db = await (globalThis as any).__npc_db;
      this.impl = new DatabaseSessionStore(db);
    }
    return this.impl;
  }
  async get(sessionId: string) {
    const s = await this.ensure();
    return s.get(sessionId);
  }
  async set(session: any) {
    const s = await this.ensure();
    return s.set(session);
  }
  async delete(sessionId: string) {
    const s = await this.ensure();
    return s.delete(sessionId);
  }
  async touch(sessionId: string) {
    const s = await this.ensure();
    return s.touch(sessionId);
  }
}

function syncCreateCache(config: AppConfig) {
  // 懒加载会话缓存（Redis 可选），失败时返回 null
  const key = '__npc_cache';
  const g = globalThis as any;
  if (!g[key]) {
    g[key] = createSessionCache(config).catch(() => null);
  }
  return g[key];
}

function syncGetDB() {
  return (globalThis as any).__npc_db;
}
