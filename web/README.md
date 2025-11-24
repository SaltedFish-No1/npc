# NPC Frontend

A React + Vite based frontend for the NPC chat application, featuring real-time streaming chat, dynamic character personas, and a responsive UI.

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Routing**: React Router 6
- **State Management**: Zustand + TanStack Query
- **Localization**: i18next
- **UI Components**: Custom component system with CSS Modules
- **Form Validation**: Zod
- **Notification**: Sonner

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm installed
- A running backend instance (see backend/README.md for details)

### Installation

```bash
# Install dependencies
pnpm install
```

### Configuration

Copy the `.env.example` file to `.env.local` and configure the following variables:

```bash
# Application ID
VITE_APP_ID=deep-persona-mob

# NPC Profile (optional; pick any id from web/src/config/characterProfile.ts)
VITE_NPC_PROFILE=mob

# NPC API Base URL
# For local development with proxy: /npc-api
# For production: https://your-backend-url.com
VITE_NPC_API_BASE_URL=/npc-api

# NPC API Key (must match backend NPC_GATEWAY_KEY)
VITE_NPC_API_KEY=replace-me
```

### Running the Application

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

The application will be available at http://localhost:5173 and will proxy API requests to the configured backend.

## Project Structure

```
web/
├── src/
│   ├── app/              # Application root and route configuration
│   ├── components/        # Reusable UI components
│   ├── config/           # Configuration files (character profiles, constants, etc.)
│   ├── features/         # Feature-specific modules (chat, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── i18n/             # Internationalization configuration
│   ├── main.tsx          # Application entry point
│   ├── schemas/          # Zod validation schemas
│   ├── services/         # Service layer (API calls, business logic)
│   ├── stores/           # Zustand state management
│   ├── styles/           # Global styles and themes
│   └── vite-env.d.ts     # Vite environment declarations
├── docs/                 # Documentation
│   └── web-arch.md       # Frontend architecture overview
└── package.json          # Project dependencies and scripts
```

## Key Features

### Real-Time Streaming Chat

- SSE (Server-Sent Events) streaming for real-time chat responses
- Interactive chat interface with message history
- Live content preview during streaming

### Dynamic Character Personas

- Multiple character presets with unique personalities
- Automatic avatar generation based on character state
- Dynamic mood and stress level indicators

### Responsive UI

- Mobile-first design
- Custom styled components with CSS Modules
- Dark theme support

### Developer Tools

- Debug panel with system logs and current state
- Settings modal for backend configuration
- Language switching support

## Architecture

For a detailed overview of the frontend architecture, please refer to [web-arch.md](docs/web-arch.md).

## Developer Workflow

1. **Branch**: Create a new branch for your feature or bugfix
2. **Code**: Follow the existing coding style and conventions
3. **Test**: Ensure your changes work correctly
4. **Lint**: Run `pnpm lint` to check for code quality issues
5. **Format**: Run `pnpm format` to format your code
6. **Type Check**: Run `pnpm typecheck` to ensure type safety
7. **Commit**: Commit your changes with a descriptive message
8. **Push**: Push your branch and create a PR

## Contributing

Please follow the project's coding guidelines and PR process.

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. See the [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) for more details.
