# Repository Guidelines

## Purpose

Xenia Way is a candidate-facing workspace for recording employer conversations, job applications, follow-ups, and outcomes. Each signed-in candidate owns a private application board. Preserve the six-status workflow (`saved`, `applied`, `interview`, `offer`, `rejected`, and `withdrawn`), authenticated ownership boundary, separate archive and blacklist semantics, and shared API contracts when changing the code.

The repository describes the candidate-tracking product and its local development environment. Document only capabilities that are present in the current source and shared contracts.

## Structure

- `apps/web` contains the React/Vite SPA, routes, Redux Toolkit UI state, TanStack Query hooks, API client, Tailwind styles, and reusable primitives.
- `apps/web/src/features/applications` groups board, collection, form, activity, archive, blacklist, and filter concerns by responsibility. `application-workspace` contains the per-application workspace, organized into `page`, `overview`, `lifecycle`, `preparation`, `contacts`, `follow-ups`, `shared`, and `test-support`; it shares the application's authenticated lifecycle and ownership rules. The sibling `activity` feature owns both the query-backed collection-card activity view and the controlled workspace activity section.
- `apps/api` contains the Bun/Elysia server, domain-grouped routers under `src/routes/`, authentication and CSRF services, repositories, Drizzle schema, migrations, and development seed command. `src/routes/index.ts` composes health, auth, preferences, and application routers; application routes are grouped into collection, item, events, and board operations.
- `packages/shared` contains Zod input schemas and public TypeScript response types consumed by both applications.
- `tests/e2e` contains Playwright browser workflows; package tests live beside source files as `*.test.ts`.
- `docs` contains human and AI-facing architecture, API, database, operations, testing, and schema-change documentation.
- `infra/docker-compose.yml` defines the local PostgreSQL, Redis, and Mailpit services.

## Development commands

Use [README](README.md#install-and-run-locally) for setup and the command table, [Operations](docs/operations.md#local-lifecycle) for prerequisites, and [Testing](docs/testing.md#commands) for verification. Keep commands synchronized with root `package.json`, `.env.example`, and `infra/docker-compose.yml`. Run browser suites sequentially: they share disposable fixtures and Redis database 15.

## Coding conventions

Use TypeScript with two-space indentation, double-quoted imports and strings, semicolons, and trailing commas consistent with the existing source. Use `camelCase` for values and functions, `PascalCase` for React components and types, and kebab-case for route/page filenames. Keep API JSON camelCase and wrapped in the documented `data` or `error` envelope, except for the direct `/api/health` response. Prefer the shared Zod schemas at all browser/API boundaries.

Use braces and multiline bodies for every `if`/`else` and loop, including one-statement guards. Keep simple ternaries for short two-way values; replace nested ternaries with explicit control-flow statements. Preserve evaluation order, branch priority, and TypeScript narrowing when refactoring control flow.

Avoid redundant `else` blocks after branches that exit with `return`, `throw`, `break`, or `continue`; keep the remaining path at the outer indentation level. Preserve nesting when a later check depends on an earlier condition or an `else` represents an intentional alternative.

Do not reassign function parameters; use named local values for normalized or transformed inputs. `style/noParameterAssign` enforces this while allowing property assignments, including Redux Toolkit's intentional Immer-backed reducer updates. This allowance does not make arbitrary object mutation safe.

Declare each variable separately; do not combine multiple declarators in one `const`, `let`, or `var` statement. `style/useSingleVarDeclarator` enforces this.

Use explicit `Boolean`, `Number`, and `String` conversions rather than coercion shorthand; `complexity/noImplicitCoercions` enforces this. Keep direct truthiness guards where they narrow nullable values, and preserve conversion semantics when refactoring. Use `T[]` and `readonly T[]` array types consistently; `style/useConsistentArrayType` enforces shorthand syntax.

Keep each function's cognitive complexity at or below 15; `complexity/noExcessiveCognitiveComplexity` is an error. Prefer early guards, flat discriminant switches, and cohesive named helpers. Preserve evaluation order, cancellation, ownership, and fallback behavior. Do not add suppressions, raise the limit, or fragment logic into meaningless helpers just to satisfy the score.

Break complex boolean expressions into named `const` predicates that describe their meaning, then combine those predicates in a short condition or return value. Keep simple guards and render-only conditions inline. Do not eagerly evaluate awaited work, side effects, expensive checks, or property access that depends on an earlier guard; use early returns or retain short-circuiting where needed. This is a code-review convention, not a separate Biome rule.

Prefer `switch` over an `if`/`else if` chain when choosing among multiple values of the same discriminant, such as a field, status, action, route, or keyboard key. Use `if` for ranges, independent predicates, and compound conditions; do not use `switch (true)` as a substitute. Keep intentional fallbacks and no-op cases explicit where needed, prevent accidental fallthrough, and scope case-local declarations with braces.

Use the same basename for colocated component files: `foo.ts` for logic, `foo.tsx` for rendering, `foo.styles.ts` for Tailwind Variants, and `foo.test.tsx` for component behavior tests. Do not prefix component logic filenames with `use-`; React hook function names must still start with `use`. When logic and rendering share a basename, import the rendering component with an explicit `.tsx` extension and its logic with `.ts` to avoid ambiguous module resolution. Shared contracts may remain in a separate `.types.ts` file. Apply this naming to new or refactored components; it does not require renaming unrelated existing files.

Across production frontend components in `apps/web/src`, keep all component behavior in matching `foo.ts` files and all Tailwind classes in colocated `foo.styles.ts` slot recipes. Give every native HTML element its own semantic slot, including unstyled elements; repeated instances of the same mapped element use its semantic slot. TSX should contain only component wiring, render conditions, list mapping, and bindings, with no inline event handlers, class literals, state/effects, translations, formatting, or data preparation. JSX-only render callbacks are allowed for third-party render-prop APIs; their behavioral adapters belong in `.ts`. Static components need no empty logic file. Shared contracts and focused existing support hooks may stay in their `.ts` modules. Instantiate state-independent slot sets at module scope and preserve existing component/ref APIs and lazy-loading boundaries.

Keep the non-composite compiler setup and explicit `.ts`/`.tsx` imports. Register the HTML-loaded `src/main.tsx` entry in `files` and keep other rendering files reachable through imports. See [TypeScript configuration](docs/architecture.md#typescript-configuration) for the glob-discovery exception and environment boundaries.

Run `bun run format` after source edits and `bun run lint` before committing. Biome owns formatting and lint rules for JavaScript and TypeScript source, tests, scripts, and root configuration files. Generated `dist` output and dependencies are excluded. `style/noNestedTernary`, `style/noUselessElse`, and `style/useBlockStatements` enforce the control-flow conventions.

Add API endpoints to the matching domain router and register domain routers through `apps/api/src/routes/index.ts`; keep `apps/api/src/app.ts` focused on service construction, global middleware, and error handling. Reuse typed guards from `routes/support/auth-guard.ts` for authenticated reads and authenticated mutations. Use the CSRF-only guard for public credential/password-reset flows and logout, which may operate without an authenticated user context. Keep the public health probe and CSRF-session bootstrap outside authenticated guards, and leave route-specific validation, repository operations, response schemas, and exceptional error handling visible in their endpoint handlers. Do not add generic CRUD route factories.

Keep server state in TanStack Query and local presentation state in Redux Toolkit. Keep database access behind typed repositories. Every application repository operation must be scoped by authenticated user ID. Mutating authenticated requests require the session CSRF token.

Application activity is application-specific: system history is immutable and written transactionally with meaningful application mutations, while owner-created events can be edited or deleted. Activity reads and writes must remain owner-scoped; permanent application deletion cascades to events. Use shared event schemas and render user-entered event text as plain text.

Export fields are explicitly allowlisted in `apps/api/src/routes/applications/export-csv.ts`. Keep each column name and value reader together so headers and rows stay aligned. Preserve formula-injection protection and exclude authentication data. Do not silently add exported fields or change identifier exposure; follow the [current export contract](docs/api.md#data-export).

Internationalization is owned by i18next/react-i18next, not Redux. Supported locales are `en`, `ru`, `uk`, and `he`; English is the fallback, all non-English dictionaries are dynamically imported, and Hebrew uses right-to-left document direction. The server preference contract is `selectedLanguage`, `selectedTheme`, `selectedFormPresentation`, and `wasIntroduced`. The browser stores `language`, `theme`, `formPresentation`, and `wasIntroduced` in one flat object under the local-storage key `userPreferences`. Apply the browser cache immediately, let non-null server selections and server `wasIntroduced` win after login or registration, never upload browser values automatically, and synchronize only explicit user actions after updating local state first. Do not add preference hydration gates. Translate UI copy and stable API error codes, preserve canonical status values and user-entered content, update `html[lang]` and `html[dir]`, and format dates with the active locale.

Keep mail delivery behind the injectable mailer interface. Preserve the documented generic password-recovery success and distinguishable known-account failure paths; see [API authentication](docs/api.md#health-and-authentication). Use Mailpit locally, or the intentional non-production console fallback only when SMTP is absent. Treat its complete reset URL/raw token as sensitive; never add a test-only production endpoint exposing tokens.

For frontend work, prefer semantic controls over ARIA recreation, associate every form control with a label, provide `name` and appropriate `autocomplete`, keep icon-only actions labeled, use `:focus-visible`, maintain keyboard alternatives for drag-and-drop, and preserve accessible modal/drawer behavior. Use `…` for loading copy and announce asynchronous status changes with an appropriate live region.

## Testing expectations

Do not add automated style tests or assertions for class names, recipes, slot overrides, CSS properties, decorative layout, or visual snapshots. Keep automated coverage focused on behavior, semantics, accessibility, persistence, and security; inspect styling manually.

Use Vitest for shared contracts, authentication, repository mapping, seed invariants, and API behavior. Use Playwright for complete browser workflows. New routes, validation rules, security behavior, ownership rules, archive transitions, user-visible workflows, and accessibility behavior require focused regression coverage where practical. Exercise keyboard navigation and responsive states for changed UI.

Keep development seed data deterministic and aligned with the current application and workspace schema. When fixture counts or content change, update seed invariant tests and the setup/database documentation.

Application workspace changes must preserve saved preparation/contact/follow-up data, keyboard navigation, and focus entry/return behavior alongside the ownership and lifecycle rules above.

Application and preparation fields in the workspace use `@atlaskit/inline-edit` for read/edit views and confirm/cancel controls. Keep persistence in the existing field hooks, send one-field application patches, and preserve the dirty compact-field warning and immediate status selection. Do not restore the former custom compact or reusable text editor components. The create-application modal/drawer is separate from workspace editing.

Locale changes require focused dictionary/selector tests and a browser test covering language switching, `html[lang]`, `html[dir]`, and reload persistence. Keep all four dictionaries structurally aligned with the English source dictionary.

Before claiming completion, run the checks relevant to the change. Use the full [verification sequence](docs/testing.md#commands) for a full change; report failures or unavailable checks explicitly. Workspace and activity tests share the explicit i18n initializer at `apps/web/src/test/initialize-test-i18n.ts`, rather than duplicating setup.

## Security and configuration

Never commit `.env`, passwords, session IDs, or generated test artifacts. Use `.env.example` as the configuration template. Passwords are hashed with Argon2id; session IDs are stored in HttpOnly, SameSite=Lax cookies that must be `Secure` in production; CSRF tokens are stored server-side and sent in `x-csrf-token`; Redis stores only hashed-key rate-limit counters for login, registration, and password reset and these flows fail closed when Redis is unavailable. Production requires explicit non-local PostgreSQL, Redis, HTTPS app-origin, SMTP, and sender configuration; `CORS_ORIGIN` defaults to the app origin and must also be HTTPS. Reset tokens remain random, hashed at rest, one-hour, single-use values, and successful resets invalidate all sessions. Do not weaken ownership checks, cookie settings, origin validation, CSRF, or rate limiting to make tests pass.

## Change boundaries

Do not add new product features, pages, or infrastructure outside the documented candidate-tracking scope without explicit approval. If a requested change conflicts with the API contract or requires a data-bearing database change outside the current schema-only policy, stop and ask for direction.

## Documentation

When changing product behavior, setup, commands, environment variables, API contracts, schema, security behavior, tests, or supported locales, update the relevant current documentation and README links in the same change. Keep current documentation grounded in source, shared contracts, checked-in configuration, and executable commands.

Keep completed architecture and workflow guidance in the current documents under `docs/`. Remove obsolete or superseded design/implementation Markdown files once their useful guidance is reflected there; retain approved plans for work that is still pending.

## Project backlog

Use `docs/backlog.md` to track any worthwhile task discovered during development that is outside the scope of the current task, including features, bugs, documentation, security, operations, and refactoring. Do not expand the current task to implement it: add a concise, evidence-based record describing the affected area, why the work may help, a possible direction, and relevant behavior or test guardrails. Check for an existing entry first and update it instead of duplicating it. Backlog entries are not authorization to implement future work. Remove or revise entries when they are completed or no longer relevant.
