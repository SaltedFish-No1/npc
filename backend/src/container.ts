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

export const buildAppContext = (config: AppConfig): AppContext => {
  const baseDir = process.cwd();
  const characterService = new CharacterService(path.resolve(baseDir, 'config/characters'));
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
