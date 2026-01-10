# Decisions - Decision Intelligence Journal

A Decision Intelligence Journal application that enables users to record decisions via voice, receive AI-powered analysis and emotional state detection, and track outcomes over time.

## Tech Stack

- **Frontend**: React 18, TypeScript 5, Vite, Tailwind CSS 3
- **Backend**: Node.js 20+, Fastify 4, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Package Manager**: pnpm with Turborepo

## Prerequisites

- **Node.js**: v20.0.0 or higher
- **pnpm**: v8.0.0 or higher

### Installing pnpm

```bash
npm install -g pnpm
```

Or using Corepack (recommended):

```bash
corepack enable
corepack prepare pnpm@8.15.0 --activate
```

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd decisions
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
# Frontend (exposed to browser)
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend (server-side only)
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 4. Start development servers

```bash
pnpm dev
```

This starts both the frontend and backend in parallel:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Project Structure

```
decisions/
├── apps/
│   ├── web/                    # React frontend application
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities
│   │   │   ├── pages/          # Page components
│   │   │   └── main.tsx        # Entry point
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── api/                    # Fastify backend application
│       ├── src/
│       │   ├── routes/         # API routes
│       │   ├── services/       # Business logic
│       │   ├── lib/            # Utilities
│       │   └── index.ts        # Entry point
│       └── package.json
├── packages/
│   └── shared/                 # Shared TypeScript types
│       ├── src/
│       │   ├── types/          # Type definitions
│       │   └── constants/      # Shared constants
│       └── package.json
├── pnpm-workspace.yaml         # pnpm workspace configuration
├── turbo.json                  # Turborepo pipeline configuration
├── tsconfig.base.json          # Base TypeScript configuration
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
└── package.json                # Root package.json with scripts
```

## Available Scripts

Run these commands from the root directory:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check code formatting |
| `pnpm clean` | Remove build artifacts and node_modules |

### Running Individual Apps

```bash
# Start only the frontend
pnpm --filter web dev

# Start only the backend
pnpm --filter api dev

# Build only the shared package
pnpm --filter @decisions/shared build
```

## Path Aliases

The frontend uses path aliases for cleaner imports:

```typescript
// Instead of:
import { Button } from '../../../components/Button';

// Use:
import { Button } from '@/components/Button';
```

Available aliases:
- `@/` - `src/`
- `@/components` - `src/components/`
- `@/lib` - `src/lib/`
- `@/hooks` - `src/hooks/`

## Shared Types

The `@decisions/shared` package contains TypeScript types shared between frontend and backend:

```typescript
import { Decision, DecisionStatus, EmotionalState } from '@decisions/shared';

const decision: Decision = {
  id: '123',
  title: 'Choose new tech stack',
  status: 'in_progress',
  // ...
};
```

## Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Start development servers**
   ```bash
   pnpm dev
   ```

3. **Make changes** - Hot reload is enabled for both frontend and backend

4. **Check for errors**
   ```bash
   pnpm lint
   pnpm typecheck
   ```

5. **Format code**
   ```bash
   pnpm format
   ```

6. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

## Troubleshooting

### Port Already in Use

If ports 5173 or 3001 are already in use, you can configure different ports:

**Frontend**: Edit `apps/web/vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 5174 // Change to available port
  }
})
```

**Backend**: Set the `PORT` environment variable:
```bash
PORT=3002 pnpm --filter api dev
```

### pnpm Not Found

Ensure pnpm is installed globally:
```bash
npm install -g pnpm
```

### Node.js Version

This project requires Node.js 20 or higher. Check your version:
```bash
node --version
```

Install the correct version using [nvm](https://github.com/nvm-sh/nvm):
```bash
nvm install 20
nvm use 20
```

### TypeScript Errors in Shared Package

If you see TypeScript errors related to `@decisions/shared`, rebuild the shared package:
```bash
pnpm --filter @decisions/shared build
```

## License

Private - All Rights Reserved
