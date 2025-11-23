# Deep Persona NPC

A React + Vite playground for building richly-configured NPC chat experiences on top of a Fastify gateway. The frontend streams reasoning + replies from the backend, keeps a synchronized session cache, and lets you flip between complete character presets with one config change.

## Feature highlights

- 🎭 **Unified persona model** – Each NPC ships with a `UnifiedCharacterModel` template (see `web/src/schemas/character.ts`) that covers vitals, traits, skills, memories, and relationship graphs.
- 🌐 **Dynamic i18n** – Interface copy is translated with i18next while persona-specific strings (codename, taglines, subtitles) are loaded from the active NPC preset so localization stays in sync with the character.
- ⚙️ **Controller-driven chat** – `useChatController` coordinates auth, session persistence, streaming responses, and avatar generation, keeping UI components declarative.
- 📦 **Session snapshots** – `sessionService` mirrors the backend session state locally so React Query can stay optimistic while the Fastify store remains the source of truth.
- 🚀 **NPC API gateway** – All chat/image requests flow through the Fastify backend (`/api/npc/*`). Vite now proxies `/npc-api/*` during local dev so you can run the SPA and backend together without CORS pain.

## Tech stack

- React 18 with TypeScript and Vite
- Zustand for lightweight stores + React Query for async orchestration
- i18next for localization, Zod for runtime validation
- pnpm for package management

## Repo layout

- `web/` – React + Vite SPA (all instructions below target this package)
- `backend/` – Fastify gateway that proxies Volcengine APIs

## Getting started

1. **Install dependencies**

   ```bash
   pnpm install
   ```

   This installs the workspace root plus the `web/` package. The Fastify backend still manages its dependencies inside `backend/` (see its README for details).

2. **Configure environment variables**

   Copy `web/.env.example` to `web/.env.local` (or your preferred env file) and adjust as needed:

   ```bash
   VITE_APP_ID=deep-persona-mob
   VITE_NPC_PROFILE=mob                 # optional; pick any id from NPC_PRESETS
   VITE_NPC_API_BASE_URL=/npc-api       # keep the proxy path for local dev
   VITE_NPC_API_KEY=replace-me          # must match backend NPC_GATEWAY_KEY (not the provider key)
   ```

   - When developing locally, run the backend (`cd backend && pnpm dev`) so `/npc-api/*` is proxied to http://localhost:4000.
   - In production, set `VITE_NPC_API_BASE_URL` to the deployed Fastify URL (e.g., `https://npc.yourdomain.com`) and keep the shared `VITE_NPC_API_KEY` in sync with the backend’s `NPC_GATEWAY_KEY` (falls back to `LLM_API_AUTH_TOKEN` if unset).
   - `VITE_NPC_PROFILE` can still be overridden at runtime via `window.__npc_id = 'reigen'` in the browser console.

3. **Run the frontend dev server**

   ```bash
   pnpm dev
   ```

   The root-level script proxies to `pnpm --filter @npc/web dev`, so you can stay in the repo root (or `cd web` and run the same command manually). The SPA mounts at http://localhost:5173 and forwards API calls to whichever backend you configured above.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the `@npc/web` Vite dev server (proxy + HMR). |
| `pnpm build` | Type-check via project references and emit the production bundle. |
| `pnpm preview` | Preview the production build locally. |
| `pnpm typecheck` | Run `tsc --noEmit` for fast type verification. |
| `pnpm lint` | Lint all TS/TSX files via the frontend package. |
| `pnpm format` | Format sources with Prettier. |

## NPC presets & localization

NPC definitions live in `web/src/config/characterProfile.ts`:

- `NPC_PRESETS` enumerates each character’s `CharacterProfile`, `UnifiedCharacterModel` template, and per-locale copy (`appTitle`, `appSubtitle`).
- `getActiveCharacterModel()` seeds sessions with the proper model, while `getActiveNpcLocalization()` updates document titles and header subtitles automatically.
- Add new presets by cloning an existing entry and following the schema documented in `docs/unified-character-model.md`.

## Additional docs

- `docs/architecture.md` – Chat feature layering, controller contract, and proxy details.
- `docs/unified-character-model.md` – Full breakdown of the V3 persona schema plus switching notes.

Have fun experimenting with different personas and prompts! 🎮
