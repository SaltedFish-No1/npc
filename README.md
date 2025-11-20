# Deep Persona NPC

A React + Vite playground for building richly-configured NPC chat experiences on top of Volcengine's Doubao models. The app streams reasoning + replies, keeps conversations in the browser, and lets you flip between complete character presets with one config change.

## Feature highlights

- 🎭 **Unified persona model** – Each NPC ships with a `UnifiedCharacterModel` template (see `src/schemas/character.ts`) that covers vitals, traits, skills, memories, and relationship graphs.
- 🌐 **Dynamic i18n** – Interface copy is translated with i18next while persona-specific strings (codename, taglines, subtitles) are loaded from the active NPC preset so localization stays in sync with the character.
- ⚙️ **Controller-driven chat** – `useChatController` coordinates auth, session persistence, streaming responses, and avatar generation, keeping UI components declarative.
- 📦 **Pluggable storage** – `sessionService` uses localStorage with an in-memory fallback, making it easy to replace with a real backend when needed.
- 🚀 **Doubao streaming proxy** – Vite proxies `/ark-api/*` in dev so the browser can call Volcengine without CORS issues.

## Tech stack

- React 18 with TypeScript and Vite
- Zustand for lightweight stores + React Query for async orchestration
- i18next for localization, Zod for runtime validation
- pnpm for package management

## Getting started

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env.local` (or your preferred env file) and adjust as needed:

   ```bash
   VITE_APP_ID=deep-persona-mob
   VITE_API_BASE_URL=/ark-api        # use a deployed URL in production
   VITE_NPC_PROFILE=mob              # optional; pick any id from NPC_PRESETS
   ```

   - Leave `VITE_API_BASE_URL=/ark-api` for local dev to hit the Vite proxy.
   - Set `VITE_NPC_PROFILE` to `reigen` (or another preset) to boot a different character. You can also override at runtime via `window.__npc_id = 'reigen'` in the browser console.

3. **Run the dev server**

   ```bash
   pnpm dev
   ```

   The app mounts at http://localhost:5173 by default.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Vite in development mode (with proxy + HMR). |
| `pnpm build` | Type-check via project references and emit the production bundle. |
| `pnpm preview` | Preview the production build locally. |
| `pnpm typecheck` | Run `tsc --noEmit` for fast type verification. |
| `pnpm lint` | Lint all TS/TSX files (requires ESLint flat config cleanup). |
| `pnpm format` | Format sources with Prettier. |

## NPC presets & localization

NPC definitions live in `src/config/characterProfile.ts`:

- `NPC_PRESETS` enumerates each character’s `CharacterProfile`, `UnifiedCharacterModel` template, and per-locale copy (`appTitle`, `appSubtitle`).
- `getActiveCharacterModel()` seeds sessions with the proper model, while `getActiveNpcLocalization()` updates document titles and header subtitles automatically.
- Add new presets by cloning an existing entry and following the schema documented in `docs/unified-character-model.md`.

## Additional docs

- `docs/architecture.md` – Chat feature layering, controller contract, and proxy details.
- `docs/unified-character-model.md` – Full breakdown of the V3 persona schema plus switching notes.

Have fun experimenting with different personas and prompts! 🎮
