import type { IncomingMessage } from 'node:http';

import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createServer } from '../src/server.js';
import type { AppConfig } from '../src/config/env.js';

const TEST_TOKEN = 'test-token';

const testConfig: AppConfig = {
  NODE_ENV: 'test',
  PORT: 0,
  LLM_API_AUTH_TOKEN: 'provider-token',
  NPC_GATEWAY_KEY: TEST_TOKEN,
  LLM_API_BASE: 'https://example.com/v1',
  LLM_API_KEY: 'test-api-key',
  TEXT_MODEL_NAME: 'mock-text-model',
  IMG_MODEL_NAME: 'mock-image-model',
  SESSION_STORE: 'memory',
  MOCK_LLM_RESPONSES: true
};

describe('Headless NPC backend integration', () => {
  let app: FastifyInstance;
  let sessionId: string;

  beforeAll(async () => {
    app = await createServer(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const authedGet = (url: string) => request(app.server).get(url).set('x-api-key', TEST_TOKEN);
  const authedPost = (url: string) => request(app.server).post(url).set('x-api-key', TEST_TOKEN);

  it('responds to health checks without auth', async () => {
    const res = await request(app.server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('lists available characters', async () => {
    const res = await authedGet('/api/characters');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('id');
  });

  it('activates a character session', async () => {
    const res = await authedPost('/api/characters/mob/activate').send({ languageCode: 'en' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body.characterState).toBeTruthy();
    sessionId = res.body.sessionId;
  });

  it('handles a non-streaming chat turn', async () => {
    const res = await authedPost('/api/npc/chat').send({
      sessionId,
      messages: [{ role: 'user', content: 'Hello there' }]
    });
    expect(res.status).toBe(200);
    expect(res.body.assistantMessage?.role).toBe('assistant');
    expect(res.body.sessionVersion).toBeGreaterThan(1);
  });

  it('handles streaming chat responses', async () => {
    const res = await authedPost('/api/npc/chat/stream')
      .send({
        sessionId,
        stream: true,
        messages: [{ role: 'user', content: 'streaming please' }]
      })
      .buffer(true)
      .parse((res, cb: (err: Error | null, data?: string) => void) => {
        const incoming = res as unknown as IncomingMessage;
        incoming.setEncoding('utf8');
        let data = '';
        incoming.on('data', (chunk: string) => {
          data += chunk;
        });
        incoming.on('end', () => cb(null, data));
      });

    expect(res.status).toBe(200);
    const payload = res.body as string;
    expect(payload).toContain('event: final');
    expect(payload).toContain('event: end');
  });

  it('generates images and updates session state', async () => {
    const res = await authedPost('/api/npc/images').send({
      sessionId,
      prompt: 'Test watercolor scene',
      ratio: '1:1',
      updateAvatar: true
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('imageUrl');
    expect(res.body.sessionVersion).toBeGreaterThan(1);
  });

  it('rejects requests without API key', async () => {
    const res = await request(app.server).get('/api/characters');
    expect(res.status).toBe(401);
  });
});
