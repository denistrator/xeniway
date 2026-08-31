# Hello World Full-Stack Skeleton Design

## Goal

Build a small, runnable full-stack playground that demonstrates the primitive use of the requested frontend, backend, and infrastructure libraries without introducing product-specific complexity.

## Scope

The app will be a Bun workspace containing a React/Vite frontend, a Bun/Elysia API, a shared Zod contract package, and Docker Compose PostgreSQL infrastructure. It will demonstrate:

- React and TypeScript rendering
- Vite development and production builds
- Redux Toolkit local state with a counter
- TanStack Query server state with loading, error, and mutation flows
- React Router navigation between `/` and `/about`
- Tailwind CSS styling
- shadcn/ui-style reusable primitives (`Button`, `Card`, `Input`, and `Badge`)
- Vitest unit/API tests
- Playwright browser smoke tests
- Bun runtime and scripts
- Elysia HTTP routes
- Zod request validation
- Drizzle ORM persistence
- PostgreSQL via Docker Compose
- GitHub Actions CI

Redis and S3/R2 are intentionally deferred because this hello-world demo has no use case for either. The README will document them as future extension points.

## Architecture

```text
apps/
  web/        React + Vite frontend
  api/        Bun + Elysia backend
packages/
  shared/     Zod schemas and inferred TypeScript types
infra/
  docker-compose.yml
  postgres/
```

The frontend communicates with the API over HTTP. The shared package exposes the message input schema so client validation and API validation use the same contract. The API owns database access and uses Drizzle to read and write PostgreSQL. The frontend uses TanStack Query for API data and Redux Toolkit only for local counter state.

## API Contract

Routes:

```text
GET  /api/health
GET  /api/hello
GET  /api/messages
POST /api/messages
```

The shared input contract is:

```ts
messageInputSchema = z.object({
  text: z.string().trim().min(1).max(240),
});
```

`GET /api/hello` returns a stable greeting and timestamp. `GET /api/messages` returns persisted messages. `POST /api/messages` validates the request body, inserts a message through Drizzle, and returns the created record. Errors use consistent JSON responses through Elysia's error handling.

## Frontend Experience

The `/` dashboard will contain:

1. An API status card that loads `/api/health` and displays loading, success, or failure.
2. A hello card that loads `/api/hello` through TanStack Query.
3. A message form using the shared Zod schema, with local validation and a mutation that invalidates the message query after success.
4. A persisted message list.
5. A Redux Toolkit counter with increment and decrement controls.
6. Navigation to `/about`.

The `/about` page will briefly explain which library owns each piece of the demo.

## Error Handling

- Empty or overlong message text is rejected locally and by the API.
- Query and mutation failures render visible error panels.
- Loading states are rendered for API queries and form submission.
- The API reports missing database configuration clearly at startup.
- `/api/health` performs a database check and reports service status.

## Testing

Vitest will cover the shared Zod schema and API behavior, including acceptance of valid input and rejection of invalid input. Playwright will start the frontend/API dev servers and verify the main browser flow: page load, API greeting, counter interaction, route navigation, and message submission.

## Operations

The documented local workflow will be:

```text
bun install
bun run db:up
bun run db:migrate
bun run dev
bun run test
bun run test:e2e
bun run typecheck
bun run build
```

The repository will include `.env.example` with a local PostgreSQL connection string. Docker Compose will provide PostgreSQL only. GitHub Actions will install Bun and dependencies, start PostgreSQL, apply migrations, run typechecks, Vitest, the production build, and Playwright.

## Success Criteria

- A fresh checkout starts with Bun and Docker using the documented commands.
- The React app loads at `/` and `/about`.
- The greeting is fetched from Elysia rather than hardcoded in React.
- Valid messages are stored in and read from PostgreSQL through Drizzle.
- Invalid messages are rejected by shared Zod validation.
- The Redux counter updates independently from server cache state.
- Vitest and Playwright each have meaningful passing coverage.
- The production build and CI workflow are configured.
