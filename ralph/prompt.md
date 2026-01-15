# Ralph Agent Instructions (Claude Code Edition)

You are an autonomous coding agent (Claude Code) working on a software project.

## Your Task

1. Read the PRD at `ralph/prd.json` (relative to project root)
2. Read the progress log at `ralph/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. **BEFORE implementing**: Consult context7 for relevant documentation (see Documentation Requirements below)
6. Implement that single user story
7. Run quality checks: `pnpm build` and `pnpm lint` from root
8. **Run tests** to verify acceptance criteria (see Testing Requirements below)
9. Update AGENTS.md files if you discover reusable patterns (see below)
10. If ALL checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
11. Update the PRD to set `passes: true` for the completed story
12. Append your progress to `ralph/progress.txt`

## Project Structure (Turborepo Monorepo)

This is a Turborepo monorepo with pnpm workspaces:

- `apps/web` - React + Vite + TypeScript frontend
- `apps/api` - Fastify + TypeScript backend
- `apps/e2e` - Playwright E2E tests
- `packages/types` - Shared TypeScript types
- `packages/supabase` - Supabase client factory

## Progress Report Format

APPEND to ralph/progress.txt (never replace, always append):

```
## [Date/Time] - [Story ID]
Iteration: [iteration number]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the voice recorder is in component X")
---
```

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Turborepo pipeline: build depends on ^build, lint and test run in parallel
- Use @decisions/types for shared types between apps
- Supabase client from packages/supabase with proper RLS
- React components in src/components/[feature]/
- Fastify routes in src/routes/[feature].ts
```

Only add patterns that are **general and reusable**, not story-specific details.

## Update AGENTS.md Files

Before committing, check if any edited files have learnings worth preserving in nearby AGENTS.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing AGENTS.md** - Look for AGENTS.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good AGENTS.md additions:**

- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**

- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update AGENTS.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Documentation Requirements (context7)

**BEFORE implementing any feature**, use context7 MCP to consult relevant documentation:

1. **For React patterns**: Query context7 for React 18+ documentation
   - Hooks usage (useState, useEffect, useContext)
   - Component composition
   - React Query / TanStack Query

2. **For Fastify patterns**: Query context7 for Fastify documentation
   - Route registration
   - Plugins and decorators
   - Request validation with Zod

3. **For Supabase**: Query context7 for Supabase documentation
   - Auth setup and flows
   - RLS policies
   - Storage buckets

4. **For external libraries**: Query context7 for the specific library
   - Tailwind CSS utilities
   - Assembly.AI API
   - OpenAI API

5. **Document findings**: Note useful patterns in your progress report

Example context7 queries:

- "React useContext for authentication"
- "Fastify TypeScript route handlers"
- "Supabase RLS policies for user data"
- "Tailwind CSS responsive design"

## Testing Requirements

**AFTER implementing**, verify acceptance criteria:

### Unit Testing (Vitest)

- Test React components with @testing-library/react
- Test utility functions and hooks
- Mock external dependencies (Supabase, APIs)

### API Testing

For every API endpoint created:

- Verify endpoint returns correct status code (200, 201, 404, etc.)
- Verify response body structure matches types
- Test authorization (401 for unauthenticated, 403 for unauthorized)

### E2E Testing (Playwright)

- Navigate to pages and verify rendering
- Test user interactions (clicks, form submissions)
- Verify data flows correctly between frontend and API

### Running Tests

```bash
# Unit tests
pnpm test

# E2E tests (requires apps running)
pnpm --filter @decisions/e2e test
```

## Quality Requirements

- ALL commits must pass `pnpm build` without errors
- ALL commits must pass `pnpm lint` without errors
- ALL acceptance criteria must be verified
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing patterns in the codebase

## Technology Stack Guidelines

1. **Frontend (apps/web):**
   - React 18+ with TypeScript
   - Vite for bundling
   - Tailwind CSS for styling
   - React Router for routing
   - TanStack Query for data fetching
   - Supabase JS client for auth and data

2. **Backend (apps/api):**
   - Fastify with TypeScript
   - @fastify/cors, @fastify/env for configuration
   - Supabase admin client for data access
   - Assembly.AI SDK for transcription
   - OpenAI SDK for extraction

3. **Shared (packages/\*):**
   - TypeScript types in packages/types
   - Supabase client factory in packages/supabase

4. **Database (Supabase):**
   - PostgreSQL with RLS enabled
   - Migrations in supabase/migrations/
   - Storage for audio files

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep build green
- Read the Codebase Patterns section in progress.txt before starting
