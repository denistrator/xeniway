# Documentation guide

Start with the [project README](../README.md#install-and-run-locally) to install, configure, and run the project. Before changing code, read [AGENTS.md](../AGENTS.md) for repository conventions and guardrails. Use this index to find the relevant contract and source rather than duplicating instructions in new documents.

## Which document to use

| Question | Canonical document |
| --- | --- |
| How do I install and start development? | [README](../README.md#install-and-run-locally) |
| How do the applications and client state fit together? | [Architecture](architecture.md) |
| What requests, responses, and ownership rules does the API support? | [API reference](api.md) |
| What tables exist, and how should schema changes work? | [Database](database.md), including [migration policy](database.md#migrations) |
| How do configuration, service lifecycle, PWA/offline deployment, and troubleshooting work? | [Operations](operations.md) |
| Which checks should I run, and what should tests cover? | [Testing](testing.md) |
| What worthwhile work is still pending? | [Backlog](backlog.md) |
| What did the UI interaction and hierarchy audit find? | [2026-10-21 audit and remediation plan](superpowers/plans/2026-10-21-ui-interaction-audit.md) |
| How should the UI audit issues be fixed? | [UI fixes implementation plan](superpowers/plans/2026-10-21-ui-fixes-implementation-plan.md) |
| How should I contribute or report a security issue? | [Contributing](../CONTRIBUTING.md), [Security](../SECURITY.md), and [Code of conduct](../CODE_OF_CONDUCT.md) |

## Where to change what

These are starting points, not permission to change unrelated behavior. Follow the contracts and tests around the affected feature.

| Area | Source starting point | Documentation to review/update |
| --- | --- | --- |
| UI rendering, behavior, or styling | [Web features](../apps/web/src/features); colocated `foo.view.tsx`, `foo.model.ts`, and `foo.styles.ts` | [Frontend conventions](../AGENTS.md#coding-conventions), [architecture](architecture.md), [testing](testing.md) |
| Application workspace, preparation, contacts, or follow-ups | [Workspace feature](../apps/web/src/features/applications/application-workspace); [activity feature](../apps/web/src/features/applications/activity) for timelines | [API](api.md), [database](database.md), [testing](testing.md) |
| Endpoint or authenticated operation | [Domain routers](../apps/api/src/routes), [router registration](../apps/api/src/routes/index.ts), [repository contracts](../apps/api/src/db/repository.ts) | [API](api.md), [architecture](architecture.md), [testing](testing.md) |
| Input validation or public response type | [Shared contracts](../packages/shared/src/index.ts), then the consuming API handler and browser feature | [API](api.md); [database](database.md) if persistence changes |
| PostgreSQL schema or development fixtures | [Database modules](../apps/api/src/db), [SQL migrations](../apps/api/drizzle) | [Database](database.md), [README fixture summary](../README.md#3-initialize-the-database), [testing](testing.md) |
| Language, translated copy, or date formatting | [i18n modules and four dictionaries](../apps/web/src/i18n) | [Architecture](architecture.md), [testing](testing.md); [API](api.md) if preference contracts change |
| Offline storage, preparation, or worker lifecycle | [Offline feature](../apps/web/src/features/offline) | [Operations](operations.md#offline-browsing-and-deployment), [architecture](architecture.md), [testing](testing.md) |
| Setup command, environment variable, or local service | [Root scripts](../package.json), [environment template](../.env.example), [Compose services](../infra/docker-compose.yml) | [README](../README.md), [operations](operations.md), [testing](testing.md) |

Current documents describe implemented behavior. Plans under `superpowers/` describe proposed or pending work, not supported product capabilities. Keep approved pending plans; remove completed or superseded plans after useful guidance is incorporated into the current documents. Record newly discovered out-of-scope work in the backlog rather than expanding the current change.
