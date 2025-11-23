# Headless NPC Backend

Fastify-based service that proxies chat and image generation requests, builds role-specific prompts, and maintains lightweight NPC sessions per the design in `docs/backend-migration-requirements.md`.

## Getting Started
1. `cd backend`
2. Copy environment variables: `cp .env.example .env` and fill in secrets.
3. Install dependencies: `pnpm install`
4. Start in watch mode: `pnpm dev`
5. Production build: `pnpm build && pnpm start`

## Environment
| Variable | Description |
| --- | --- |
| `PORT` | HTTP port (default 4000) |
| `NPC_GATEWAY_KEY` | Shared secret required via `x-api-key` header (defaults to `LLM_API_AUTH_TOKEN` when unset) |
| `LLM_API_AUTH_TOKEN` | Legacy gateway key / fallback default |
| `LLM_API_BASE` | LLM API base URL |
| `LLM_API_KEY` | API key for model provider |
| `TEXT_MODEL_NAME` / `IMG_MODEL_NAME` | Model identifiers |
| `SESSION_STORE` | `memory` (default) or future `redis` |
| `MOCK_LLM_RESPONSES` | Set `true` to stub out upstream calls |

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
- `GET /health` – health probe
- `GET /api/characters` – list characters (filterable by `languageCode`)
- `POST /api/characters/:id/activate` – activate/initialize a character session
- `POST /api/npc/chat` – non-streaming chat turn
- `POST /api/npc/chat/stream` – SSE streaming chat turn
- `POST /api/npc/images` – generate an image (optionally updating avatar)

All endpoints (except `/health`) require the `x-api-key: $NPC_GATEWAY_KEY` header (falls back to `LLM_API_AUTH_TOKEN`).

## Testing & Quality
- `pnpm typecheck` – strict TypeScript validation
- Built-in zod schemas guard configs, requests, and AI payloads
- Rate limiting, CORS, and SSE are provided via Fastify plugins

## Extensibility Notes
- Session store implements an interface to swap in Redis/DB later.
- Character definitions and prompt templates are file-based now; replace the loaders to integrate a CMS or database.
- The LLM client honors `MOCK_LLM_RESPONSES` for local development without external calls.
