# CLAUDE.md - Decision Intelligence Journal

## Project Overview

A monorepo-based Decision Intelligence Journal application for recording, analyzing, and tracking personal decisions with AI-powered insights.

## Tech Stack

### Frontend (`apps/web`)

- **React 18.3** with TypeScript 5.4
- **Vite 5.2** for bundling and dev server (port 5173)
- **Tailwind CSS 3.4** for styling
- **React Router v6** for client-side routing
- **Supabase JS Client** for auth and database

### Backend (`apps/api`)

- **Fastify 4.26** with TypeScript
- **Pino** for JSON logging
- Server runs on port 3001

### Shared (`packages/shared`)

- **@decisions/shared** - Shared TypeScript types for database entities

### Build Tools

- **pnpm 8.15** with workspaces
- **Turborepo 2.0** for build orchestration

## Project Structure

```
decision-intelligence-journal/
├── apps/
│   ├── api/                 # Fastify backend
│   │   └── src/
│   │       ├── index.ts     # Server entry point
│   │       ├── routes/      # API endpoints
│   │       └── lib/         # Utilities
│   └── web/                 # React frontend
│       └── src/
│           ├── components/  # Reusable UI components
│           ├── contexts/    # React Context (Auth)
│           ├── lib/         # Utilities (Supabase client)
│           ├── pages/       # Page components
│           ├── main.tsx     # React entry point
│           └── App.tsx      # Root component
├── packages/
│   └── shared/              # Shared types (@decisions/shared)
├── pnpm-workspace.yaml      # Workspace config
├── turbo.json               # Turborepo pipeline
└── tsconfig.base.json       # Base TS config
```

## Commands

```bash
pnpm dev          # Start all apps in parallel (frontend + backend)
pnpm build        # Build all packages for production
pnpm lint         # Run ESLint across all packages
pnpm typecheck    # TypeScript type checking
pnpm format       # Format all files with Prettier
pnpm clean        # Remove build artifacts and node_modules
```

## Environment Variables

### Frontend (`apps/web/.env`)

```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_API_URL=http://localhost:3001
```

### Backend (`apps/api/.env`)

```
PORT=3001
NODE_ENV=development
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
```

## Code Conventions

### TypeScript

- Strict mode enabled
- No unused variables or parameters
- Explicit return types on functions
- Union types preferred over enums

### React

- Functional components with hooks only
- Context API for auth state management
- Custom hooks for reusable logic

### Styling

- Tailwind CSS utilities (no custom CSS files)
- Responsive design with Tailwind breakpoints (sm:, md:, lg:)

### File Naming

- Components: PascalCase (`AuthGuard.tsx`)
- Utilities: camelCase (`supabase.ts`)
- Types: PascalCase in `types/` directory

## Key Patterns

### Authentication

- Supabase Auth with email/password and Google OAuth
- `AuthContext` provides auth state globally
- `useAuth()` hook for consuming auth state
- `<AuthGuard>` component for protected routes

### API Routes

- `/health` - Health check endpoint
- Future: `/decisions`, `/categories`

### Frontend Routes

- `/login` - Public login page
- `/signup` - Public signup page
- `/dashboard` - Protected dashboard
- `*` - Redirects to `/dashboard`

## Database Types (from @decisions/shared)

- **Profile** - User profile data
- **Category** - Decision categories with colors
- **Decision** - Main decision entity with status, outcome, emotional state
- **Option** - Alternative options within a decision
- **ProCon** - Pros/cons for options with weighting

### Enums

- `DecisionStatus`: 'in_progress' | 'decided' | 'abandoned'
- `DecisionOutcome`: 'better' | 'as_expected' | 'worse'
- `EmotionalState`: 'confident' | 'anxious' | 'uncertain' | 'excited' | 'calm' | 'stressed' | 'hopeful' | 'conflicted'

## Development Notes

### Adding New Routes (Frontend)

1. Create page component in `apps/web/src/pages/`
2. Add route in `apps/web/src/App.tsx`
3. Wrap with `<AuthGuard>` if protected

### Adding New API Endpoints (Backend)

1. Create route file in `apps/api/src/routes/`
2. Register plugin in `apps/api/src/index.ts`

### Adding Shared Types

1. Add types to `packages/shared/src/types/`
2. Export from `packages/shared/src/index.ts`
3. Import as `import { Type } from '@decisions/shared'`

## Formatting

- Single quotes
- 2-space indentation
- 100 character line width
- Trailing commas (ES5)
- LF line endings
