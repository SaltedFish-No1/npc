# Headless NPC Backend

Fastify-based service that proxies chat and image generation requests, builds role-specific prompts, and maintains lightweight NPC sessions per the design in `docs/backend-migration-requirements.md`.

## Getting Started
1. `cd backend`
2. Copy environment variables: `cp .env.example .env` and fill in secrets.
3. Ensure Postgres is reachable and pgvector is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`
4. Install dependencies: `pnpm install`
5. Start in watch mode: `pnpm dev`
6. Production build: `pnpm build && pnpm start`

## Environment
| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default 4000) |
| `NPC_GATEWAY_KEY` | Shared secret required via `x-api-key` header (falls back to `LLM_API_AUTH_TOKEN` when unset) |
| `LLM_API_AUTH_TOKEN` | Legacy gateway key / fallback default |
| `LLM_API_BASE` | LLM API base URL |
| `LLM_API_KEY` | API key for model provider |
| `TEXT_MODEL_NAME` / `IMG_MODEL_NAME` | Model identifiers |
| `DB_TYPE` | Must be `postgres` (vector retrieval required) |
| `DB_URL` | Postgres connection string |
| `DB_POOL_SIZE` | Connection pool size (default 10) |
| `SESSION_STORAGE_STRATEGY` | `database` (required) or `memory` (failover) |
| `EMBEDDING_MODEL_NAME` | Embedding model name (e.g., `text-embedding-3-large`) |
| `EMBEDDING_DIM` | Embedding vector dimension (default 1536) |
| `RAG_TOP_K` | Top‑K memories to inject (default 8) |
| `RAG_SCORE_THRESHOLD` | Similarity threshold filter (default 0.25) |
| `REDIS_URL` | Optional Redis URL for session cache |
| `MOCK_LLM_RESPONSES` | Set `true` to stub upstream calls |

## Folder Structure
```
backend/
  config/characters/     # YAML character definitions
  templates/prompts/     # Prompt templates with {{placeholders}}
  src/
    clients/             # LLM & image API client
    services/            # Character, session, prompt, chat, image modules
    routes/              # Fastify route registrations
    config/env.ts        # Typed env loader (dotenv + zod)
    server.ts            # Fastify bootstrap
    index.ts             # Entry point
```

## API Snapshot
- `GET /health` – health probe (includes DB status)
- `GET /api/characters` – list characters (filterable by `languageCode`)
- `POST /api/characters/:id/activate` – activate/initialize a character session
- `POST /api/npc/chat` – non-streaming chat turn
- `POST /api/npc/chat/stream` – SSE streaming chat turn
- `POST /api/npc/images` – generate an image (optionally updating avatar)
- `GET /api/npc/sessions/:id` – read a single session (metadata + recent messages)
- `GET /api/npc/sessions/:id/messages?limit&offset` – paginated message history
- `GET /api/npc/memory-stream?characterId&sessionId&limit&offset` – read long‑term memories

All endpoints (except `/health`) require the `x-api-key: $NPC_GATEWAY_KEY` header (falls back to `LLM_API_AUTH_TOKEN`).

## Testing & Quality
- `pnpm typecheck` – strict TypeScript validation
- Built-in zod schemas guard configs, requests, and AI payloads
- Rate limiting, CORS, and SSE are provided via Fastify plugins

## Persistence & RAG
- Tables: `sessions`, `session_messages`, `character_memory_stream`
- Embeddings: `character_memory_embeddings` (pgvector), HNSW index if available
- Flow: user input → embedding → Top‑K similarity search → inject into system prompt → write memory + embedding after the turn

## Caching & Failover
- Session cache (optional): Redis key `session:{id}`, TTL ~2h, read‑through/write‑through
- Failover: set `SESSION_STORAGE_STRATEGY=memory` to keep chat functional without persistence

## Monitoring & Logging
- Health probe includes DB status; log structured events with traceId across requests, DB operations and RAG queries
- Track DB latency/P95/P99, pool usage, cache hit rate

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. See the [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) for more details.
