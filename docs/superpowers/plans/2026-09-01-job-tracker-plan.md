# Job Tracker Full-Stack Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Bun workspace that demonstrates the requested React frontend, Elysia API, shared Zod validation, Drizzle/PostgreSQL persistence, Docker, CI, Vitest, and Playwright with a minimal job-tracker UI.

**Architecture:** `apps/web` is a Vite React client, `apps/api` is an Elysia server, and `packages/shared` owns the message schema and inferred types. The client uses TanStack Query for API state and Redux Toolkit for a counter; the API uses a repository boundary so the real Drizzle/PostgreSQL implementation can be tested with an in-memory fake.

**Tech Stack:** Bun, React, TypeScript, Vite, Redux Toolkit, TanStack Query, React Router, Tailwind CSS, shadcn/ui-style components, Vitest, Playwright, Elysia, Zod, Drizzle ORM, PostgreSQL, Docker Compose, GitHub Actions.

## Global Constraints

- Keep the implementation limited to the approved job-tracker demonstration; do not add authentication, deployment, Redis behavior, or S3/R2 behavior.
- Use Bun commands and Bun workspace packages for local development.
- Keep the shared message contract in `packages/shared/src/index.ts` and use it in both browser and API code.
- Use Drizzle for the production repository and PostgreSQL for the persisted message table.
- Expose API errors as JSON with an `error` object containing a stable `code` and human-readable `message`.
- Include visible loading and error states for API-backed UI.
- Do not claim Git commits were created: the workspace `.git` path is read-only, so logical checkpoints must be verified by files, tests, and `git diff` where available.

---

## File Map

### Root configuration

- Create `package.json` — Bun workspace scripts and shared dev dependencies, including Node and Playwright types.
- Create `tsconfig.json` — root TypeScript project references.
- Create `.gitignore` — dependency, build, environment, and test-artifact exclusions.
- Create `.env.example` — local API database configuration.
- Create `README.md` — setup, scripts, architecture, and deferred infrastructure notes.

### Shared package

- Create `packages/shared/package.json` — package metadata and source export.
- Create `packages/shared/tsconfig.json` — strict package compiler settings.
- Create `packages/shared/src/index.ts` — Zod message schema and shared response types.
- Create `packages/shared/src/index.test.ts` — valid/invalid schema tests.

### API package

- Create `apps/api/package.json` — API scripts and runtime dependencies.
- Create `apps/api/tsconfig.json` — strict API compiler settings.
- Create `apps/api/src/db/schema.ts` — Drizzle `messages` table.
- Create `apps/api/src/db/client.ts` — PostgreSQL client and Drizzle database instance.
- Create `apps/api/src/db/repository.ts` — repository interface and Drizzle implementation.
- Create `apps/api/src/db/migrate.ts` — migration runner.
- Create `apps/api/drizzle.config.ts` — Drizzle Kit configuration.
- Create `apps/api/src/app.ts` — Elysia app factory and routes.
- Create `apps/api/src/server.ts` — Bun entrypoint and environment startup.
- Create `apps/api/src/app.test.ts` — API tests with an in-memory repository.

### Web package

- Create `apps/web/package.json` — frontend scripts and dependencies.
- Create `apps/web/tsconfig.json`, `apps/web/tsconfig.app.json`, `apps/web/tsconfig.node.json` — Vite TypeScript settings.
- Create `apps/web/vite.config.ts` — React plugin and `/api` development proxy.
- Create `apps/web/tailwind.config.ts`, `apps/web/postcss.config.js` — Tailwind configuration.
- Create `apps/web/index.html` — Vite HTML entrypoint.
- Create `apps/web/src/main.tsx` — React, Redux, Query, and router providers.
- Create `apps/web/src/App.tsx` — route definitions and shared layout.
- Create `apps/web/src/index.css` — Tailwind layers and global styles.
- Create `apps/web/src/lib/api.ts` — typed fetch helpers.
- Create `apps/web/src/store.ts` — Redux Toolkit counter slice/store.
- Create `apps/web/src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx` — shadcn/ui-style primitives.
- Create `apps/web/src/components/layout.tsx` — navigation and page shell.
- Create `apps/web/src/pages/home-page.tsx` — dashboard and API-backed interactions.
- Create `apps/web/src/pages/about-page.tsx` — library explanation page.

### Infrastructure and CI

- Create `infra/docker-compose.yml` — PostgreSQL service with persistent local volume and healthcheck.
- Create `apps/api/drizzle/0000_create_messages.sql` — initial migration.
- Create `.github/workflows/ci.yml` — Bun, PostgreSQL, migrations, typecheck, tests, build, and E2E.
- Create `playwright.config.ts` — browser test server orchestration.
- Create `tests/e2e/job-tracker.spec.ts` — browser smoke flow.

---

### Task 1: Scaffold the Bun workspace and package boundaries

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`
- Create: `apps/web/package.json`, `apps/api/package.json`, `packages/shared/package.json`
- Create: `apps/web/tsconfig.json`, `apps/web/tsconfig.app.json`, `apps/web/tsconfig.node.json`, `apps/web/src/vite-env.d.ts`, `apps/api/tsconfig.json`, `packages/shared/tsconfig.json`

**Interfaces:**
- Produces workspace package names `@hello/web`, `@hello/api`, and `@hello/shared`.
- Produces root scripts `dev`, `test`, `test:e2e`, `typecheck`, `build`, `db:up`, and `db:migrate`.

- [ ] **Step 1: Create the root workspace manifest**

Create `package.json` with workspaces and scripts:

```json
{
  "name": "job-tracker",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently -k \"bun --cwd apps/api dev\" \"bun --cwd apps/web dev\"",
    "test": "bun run --cwd packages/shared test && bun run --cwd apps/api test",
    "test:e2e": "playwright test",
    "typecheck": "bun run --cwd packages/shared typecheck && bun run --cwd apps/api typecheck && bun run --cwd apps/web typecheck",
    "build": "bun run --cwd apps/web build && bun run --cwd apps/api typecheck",
    "db:up": "docker compose -f infra/docker-compose.yml up -d postgres",
    "db:down": "docker compose -f infra/docker-compose.yml down",
    "db:migrate": "bun run --cwd apps/api db:migrate"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "concurrently": "latest",
    "@types/node": "latest",
    "typescript": "latest"
  }
}
```

- [ ] **Step 2: Add workspace package manifests**

Create `packages/shared/package.json`:

```json
{
  "name": "@hello/shared",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { "zod": "latest" },
  "devDependencies": { "vitest": "latest", "typescript": "latest" }
}
```

Create `apps/api/package.json`:

```json
{
  "name": "@hello/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/server.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "db:migrate": "bun src/db/migrate.ts"
  },
  "dependencies": {
    "@elysiajs/cors": "latest",
    "@hello/shared": "workspace:*",
    "drizzle-orm": "latest",
    "elysia": "latest",
    "postgres": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "drizzle-kit": "latest",
    "bun-types": "latest",
    "vitest": "latest",
    "typescript": "latest"
  }
}
```

Create `apps/web/package.json`:

```json
{
  "name": "@hello/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --pretty false"
  },
  "dependencies": {
    "@hello/shared": "workspace:*",
    "@radix-ui/react-slot": "latest",
    "@reduxjs/toolkit": "latest",
    "@tanstack/react-query": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "lucide-react": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-redux": "latest",
    "react-router-dom": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "autoprefixer": "latest",
    "postcss": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "vite": "latest"
  }
}
```

- [ ] **Step 3: Add strict TypeScript configs and root ignore rules**

Use ES2022, `moduleResolution: "Bundler"`, `strict: true`, and `noEmit: true` in the package configs. Configure the web app with Vite client types and the API/shared packages with Bun types. Add `.env`, `node_modules`, `dist`, `playwright-report`, `test-results`, and `.DS_Store` to `.gitignore`. Add `DATABASE_URL=postgres://job_tracker:job_tracker@localhost:5432/job_tracker` to `.env.example`.

- [ ] **Step 4: Install dependencies and verify the workspace resolves**

Run: `bun install`

Expected: Bun creates `bun.lock` and resolves `workspace:*` dependencies without errors.

- [ ] **Step 5: Verify the scaffold**

Run: `bun run typecheck`

Expected: The command reaches each package; it may report missing source entrypoints until Tasks 2–4 are complete, so record the output and rerun after implementation.

---

### Task 2: Add the shared Zod contract

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/index.test.ts`
- Modify: `packages/shared/tsconfig.json`

**Interfaces:**
- Produces `messageInputSchema`.
- Produces `MessageInput`, `Message`, `HelloResponse`, `HealthResponse`, and `ApiError` types.

- [ ] **Step 1: Write the failing schema tests**

Create `packages/shared/src/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { messageInputSchema } from "./index";

describe("messageInputSchema", () => {
  it("accepts trimmed message text", () => {
    expect(messageInputSchema.parse({ text: "  hello  " })).toEqual({ text: "hello" });
  });

  it("rejects empty and overlong text", () => {
    expect(messageInputSchema.safeParse({ text: "   " }).success).toBe(false);
    expect(messageInputSchema.safeParse({ text: "x".repeat(241) }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `bun run --cwd packages/shared test`

Expected: FAIL because `packages/shared/src/index.ts` does not yet export `messageInputSchema`.

- [ ] **Step 3: Implement the shared contract**

Create `packages/shared/src/index.ts`:

```ts
import { z } from "zod";

export const messageInputSchema = z.object({
  text: z.string().trim().min(1).max(240),
});

export type MessageInput = z.infer<typeof messageInputSchema>;

export type Message = {
  id: number;
  text: string;
  createdAt: string;
};

export type HelloResponse = {
  message: string;
  runtime: "bun";
  timestamp: string;
};

export type HealthResponse = {
  status: "ok" | "error";
  database: "up" | "down";
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `bun run --cwd packages/shared test && bun run --cwd packages/shared typecheck`

Expected: 2 Vitest tests pass and TypeScript exits with code 0.

---

### Task 3: Implement Drizzle/PostgreSQL persistence and Elysia routes

**Files:**
- Create: `apps/api/src/db/schema.ts`, `apps/api/src/db/client.ts`, `apps/api/src/db/repository.ts`, `apps/api/src/db/migrate.ts`, `apps/api/drizzle.config.ts`
- Create: `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/app.test.ts`
- Create: `apps/api/drizzle/0000_create_messages.sql`
- Modify: `.env.example`, `infra/docker-compose.yml`

**Interfaces:**
- Consumes `messageInputSchema`, `Message`, `MessageInput`, `HealthResponse`, and `ApiError` from `@hello/shared`.
- Produces `MessageRepository` with `health(): Promise<boolean>`, `list(): Promise<Message[]>`, and `create(input: MessageInput): Promise<Message>`.
- Produces `createApp(repository: MessageRepository): Elysia`.

- [ ] **Step 1: Write API tests against a fake repository**

Create an in-memory test repository implementing the exact interface and tests using `app.handle(new Request(...))`. Cover `GET /api/hello`, `POST /api/messages` for valid input, `POST /api/messages` for invalid input with status 400, and `GET /api/health` when the repository reports healthy.

Example test:

```ts
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { Message, MessageInput } from "@hello/shared";
import type { MessageRepository } from "./db/repository";

function createFakeRepository(): MessageRepository {
  const messages: Message[] = [];
  return {
    async health() { return true; },
    async list() { return messages; },
    async create(input: MessageInput) {
      const message = { id: messages.length + 1, text: input.text, createdAt: new Date().toISOString() };
      messages.push(message);
      return message;
    },
  };
}

describe("API routes", () => {
  it("returns a hello response", async () => {
    const response = await createApp(createFakeRepository()).handle(new Request("http://localhost/api/hello"));
    expect(response.status).toBe(200);
    expect((await response.json()).message).toContain("Hello");
  });

  it("validates and stores messages", async () => {
    const app = createApp(createFakeRepository());
    const response = await app.handle(new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: " hello " }),
    }));
    expect(response.status).toBe(200);
    expect((await response.json()).text).toBe("hello");
  });

  it("rejects invalid messages", async () => {
    const response = await createApp(createFakeRepository()).handle(new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "   " }),
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
```

- [ ] **Step 2: Run API tests to verify they fail**

Run: `bun run --cwd apps/api test`

Expected: FAIL because the app, repository interface, and database files do not exist yet.

- [ ] **Step 3: Add the Drizzle schema and migration**

Define `messages` with `serial("id").primaryKey()`, `varchar("text", { length: 240 }).notNull()`, and `timestamp("created_at", { withTimezone: true }).defaultNow().notNull()`. Configure Drizzle Kit to read `src/db/schema.ts`, write migrations to `drizzle`, and use `DATABASE_URL`. The migration must create the `messages` table with the same columns.

- [ ] **Step 4: Add the repository boundary and PostgreSQL implementation**

Implement `MessageRepository` and `DrizzleMessageRepository`. Map the database timestamp to an ISO string. `health()` must execute `select 1` through the postgres client. `list()` must order by `createdAt` descending. `create()` must insert the validated text and return the inserted record.

- [ ] **Step 5: Implement the Elysia app factory**

Build `createApp(repository)` with CORS enabled and these handlers:

```ts
GET /api/health    -> { status: "ok", database: "up" } or 503 error response
GET /api/hello     -> { message: "Hello from Bun + Elysia!", runtime: "bun", timestamp }
GET /api/messages  -> repository.list()
POST /api/messages -> safeParse body, repository.create(), 400 on validation failure, 500 on persistence failure
```

Keep the route body type `unknown` and perform validation with `messageInputSchema.safeParse`, ensuring Zod is the source of request validation.

- [ ] **Step 6: Add the Bun server entrypoint and Docker Compose**

`src/server.ts` must read `DATABASE_URL`, create the postgres client and Drizzle repository, call `createApp(repository)`, listen on `PORT` or `3000`, and log the URL. If `DATABASE_URL` is missing, throw an error whose message names the variable.

`infra/docker-compose.yml` must define PostgreSQL 16 with database/user/password `hello`, port `5432`, a named volume, and a `pg_isready` healthcheck.

- [ ] **Step 7: Run API tests and typecheck**

Run: `bun run --cwd apps/api test && bun run --cwd apps/api typecheck`

Expected: all API tests pass and TypeScript exits with code 0 without requiring PostgreSQL because tests use the fake repository.

---

### Task 4: Build the React/Vite frontend and shadcn/ui-style primitives

**Files:**
- Create/modify all files listed under `apps/web` in the file map.

**Interfaces:**
- Consumes API routes and shared response types from `@hello/shared`.
- Produces a dashboard at `/` and explanatory page at `/about`.
- Produces Redux `counter` state and typed TanStack Query hooks in the page component.

- [ ] **Step 1: Configure Vite, Tailwind, and the API proxy**

Configure `vite.config.ts` with the React plugin and a proxy from `/api` to `http://localhost:3000`. Create `src/vite-env.d.ts` containing `/// <reference types="vite/client" />`. Add Tailwind content globs for `./index.html` and `./src/**/*.{ts,tsx}`. Add `@tailwind base`, `@tailwind components`, and `@tailwind utilities` to `src/index.css`, plus a small neutral background/font baseline.

- [ ] **Step 2: Add the provider tree and routes**

In `main.tsx`, create a `QueryClient`, Redux store provider, `BrowserRouter`, and render `App`. In `App.tsx`, define routes for `/` and `/about` inside `Layout`.

- [ ] **Step 3: Add Redux Toolkit counter state**

Create a `counterSlice` with `increment` and `decrement` reducers, configure the store, and export `RootState` and `AppDispatch`. The home page must select `state.counter.value` and dispatch the two actions.

- [ ] **Step 4: Add shadcn/ui-style primitives**

Implement `Button`, `Card`, `Input`, and `Badge` with Tailwind classes, `class-variance-authority` where useful, and `cn(...inputs: ClassValue[])` using `clsx` plus `tailwind-merge`. Components must accept standard React props and `className`.

- [ ] **Step 5: Add API helpers and the layout**

Implement `requestJson<T>(path, init?)` in `src/lib/api.ts`. It must parse JSON, throw an `Error` using `payload.error.message` for non-2xx responses, and return `T` on success. Add header navigation links and an app title in `Layout`.

- [ ] **Step 6: Implement the home page**

Use `useQuery` for `/api/health`, `/api/hello`, and `/api/messages`. Use `useMutation` for `POST /api/messages`, validate the form value with `messageInputSchema.safeParse`, show the validation message below the input, clear the input after success, and invalidate `messages` on success. Render explicit `Loading…`, `Unable to load…`, and empty-list states. Add counter buttons with accessible labels `Decrease` and `Increase`.

- [ ] **Step 7: Implement the about page**

Render a short list explaining: Query = server state, Redux = local state, Elysia = API, Zod = validation, Drizzle = database access, and Tailwind/shadcn = UI.

- [ ] **Step 8: Run the frontend typecheck and production build**

Run: `bun run --cwd apps/web typecheck && bun run --cwd apps/web build`

Expected: TypeScript and Vite both exit with code 0 and `apps/web/dist` is created.

---

### Task 5: Add Vitest configuration, Playwright smoke coverage, and CI

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/job-tracker.spec.ts`, `.github/workflows/ci.yml`
- Modify: `package.json`, `apps/api/package.json`, `packages/shared/package.json`

**Interfaces:**
- Consumes the completed web/API dev scripts and API contract.
- Produces `bun run test`, `bun run test:e2e`, and CI workflow checks.

- [ ] **Step 1: Add Playwright configuration**

Configure `playwright.config.ts` with `testDir: "./tests/e2e"`, `baseURL: "http://127.0.0.1:5173"`, one Chromium project, and a `webServer` command of `bun run dev` with port `5173`, timeout `120000`, and `reuseExistingServer: !process.env.CI`.

- [ ] **Step 2: Write the failing browser smoke test**

Create `tests/e2e/job-tracker.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("demonstrates the job-tracker stack", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Job Tracker" })).toBeVisible();
  await expect(page.getByText("Hello from Bun + Elysia!")).toBeVisible();
  await page.getByRole("button", { name: "Increase" }).click();
  await expect(page.getByText("1")).toBeVisible();
  await page.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "About this demo" })).toBeVisible();
});
```

- [ ] **Step 3: Run E2E after starting infrastructure**

Run: `bun run db:up && bun run db:migrate && bun run test:e2e`

Expected: Chromium launches and the smoke test passes. If Playwright browsers are absent, run `bunx playwright install chromium` once and rerun.

- [ ] **Step 4: Add GitHub Actions**

Create `.github/workflows/ci.yml` triggered on `push` and `pull_request`. Use `oven-sh/setup-bun`, PostgreSQL 16 as a service with `hello` credentials, `bun install --frozen-lockfile`, `bun run db:migrate`, `bun run typecheck`, `bun run test`, `bun run build`, `bunx playwright install --with-deps chromium`, and `bun run test:e2e`.

- [ ] **Step 5: Run the complete local verification suite**

Run:

```text
bun run typecheck
bun run test
bun run build
bun run db:up
bun run db:migrate
bun run test:e2e
```

Expected: every command exits 0; Vitest reports all shared/API tests passing; Vite emits a production bundle; Playwright reports the smoke test passing.

---

### Task 6: Document setup and perform final requirement verification

**Files:**
- Create: `README.md`
- Modify: `.env.example` if the final database port or variable names differ.

**Interfaces:**
- Documents the exact commands and boundaries produced by Tasks 1–5.

- [ ] **Step 1: Write the README**

Include prerequisites (Bun, Docker, and Playwright browser install), the exact setup commands, available scripts, package map, API route table, explanation of Redux vs TanStack Query, test commands, and a note that Redis/S3/R2 are intentionally deferred.

- [ ] **Step 2: Check the README against a clean-start workflow**

Follow the documented commands from the repository root and confirm the frontend URL, API URL, database migration command, and test commands match the actual scripts.

- [ ] **Step 3: Review the final file set and diff**

Run: `rg --files -g '!node_modules' -g '!dist' -g '!playwright-report' | sort` and `git diff --stat 2>/dev/null || true`.

Expected: all files in the file map exist, no generated dependency/build artifacts are accidentally tracked, and the diff contains only the approved skeleton app, documentation, infrastructure, and CI.

- [ ] **Step 4: Report verification evidence**

Record the actual exit status and concise output for typecheck, Vitest, build, migration, and Playwright. If Git remains read-only, report that no commit was created instead of implying otherwise.
