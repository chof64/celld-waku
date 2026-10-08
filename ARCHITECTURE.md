# Architecture

A small, opinionated **full-stack React** application starter using Waku and Celld. Waku owns the web application; Celld owns Worker execution and native bindings. The principles below are shared with the backend-only [celld-hono](https://github.com/chof64/celld-hono) starter.

## 1. Shared architecture principles

These principles are intentionally **identical in both Celld starters**. When changing a shared convention, update both repositories together; framework-specific sections below may differ.

1. **Celld is the execution and deployment runtime.** Use its supported Workers, Durable Objects, service bindings, Queues, Workflows, Cron, KV, D1, and R2 surfaces directly instead of inventing a Celld SDK.
2. **Keep framework conventions native.** Hono owns backend HTTP routes; Waku owns React pages, layouts, Server Components, client components, API routes, and Server Actions. Do not implement a competing router.
3. **Use an explicit public contract.** RESTful HTTP is the default for mobile clients, webhooks, integrations, and shared APIs. Waku Server Actions are suitable for application UI mutations, not a replacement for external API contracts.
4. **Give stateful entities a clear owner.** Durable Objects coordinate entity-local work. Prefer native Durable Object RPC for method calls when available; use `fetch()` for HTTP or WebSocket semantics. Waku can reach a separate Hono/DO Worker through a service binding.
5. **Keep business logic independent of transport.** HTTP routes, Server Actions, Queues, Workflows, and Durable Objects should delegate reusable domain operations to plain modules, rather than duplicating rules.
6. **Validate and authorize at every trust boundary.** Use Zod as the default schema implementation and Standard Schema where a framework provides a compatible integration. Treat Server Actions as public server entrypoints.
7. **Make state ownership explicit.** For Xicar, PlanetScale Postgres and application S3 remain authoritative; Celld coordination/cache state is rebuildable unless a feature deliberately establishes a different persistence contract.
8. **Use one canonical root `wrangler.jsonc`.** It declares binding identities and entrypoints but contains no production secrets. Do not add separate development, staging, or production Wrangler files by default.
9. **Separate application variables from fleet credentials.** `celld/env.ts` declares the application allowlist; `.env` supplies local values, and process variables override it. CI supplies application values via `ENV_FILE`; Celld bucket, node, and storage credentials remain process/infrastructure settings.
10. **Keep the Celld commands native and visible.** Project scripts may prepare environment and build artifacts, but `celld dev` and `celld deploy` own execution and publication. Do not deploy to Celld with `wrangler deploy`.
11. **Standardize operations across both starters.** Use the same production GitHub Environment contract, pinned `CELLD_VERSION`, serialized deploys, dry-run before publish, and the same single-node/multi-node/upgrade runbook.
12. **Protect persistent identities.** Treat Worker names, Durable Object class and binding names, migration tags, service bindings, and storage identities as schema. Append migrations intentionally; do not casually rename live resources.
13. **Keep the baseline small.** Development and production are the only default modes. Add optional feature folders, framework libraries, state stores, extra environments, and runtime bindings only when needed.

### Sibling starters

| Repository | Primary purpose | Routing and runtime boundary |
| --- | --- | --- |
| [`chof64/celld-hono`](https://github.com/chof64/celld-hono) | Backend-only APIs and Celld stateful services | Hono REST/WebSocket routes, Durable Objects, Queues and Workflows |
| [`chof64/celld-waku`](https://github.com/chof64/celld-waku) | Full-stack React web applications | Waku pages, RSC/SSR, client components, Server Actions and API routes |

They share **deployment, environment, security, and architectural principles**, not identical framework source code. They may run as separate Worker scripts in the same Celld fleet, connected by service bindings.

## 2. Default stack

```text
Celld
  +
Waku (React Server Components / SSR / API routes / Server Actions)
  +
React 19 + Vite + TypeScript
  +
Zod
```

Waku owns frontend routing and rendering, not a custom Hono router added by the template. APIs use standard `Request` and `Response`. Zod validates untrusted input; Standard Schema is the preferred shared schema contract for integrations that support it. Keep optional choices such as ORM, authentication provider, UI kit, state store and secrets manager open.

## 3. Rendering and client boundaries

- Put pages and layouts under `src/pages/`. The filesystem defines Waku URLs.
- Static rendering is the default. Set `getConfig` to `{ render: 'dynamic' }` for per-request SSR of authenticated or changing content.
- Fetch data and access Celld bindings inside server components, Server Actions or API handlers. Use `'use client'` only where React state, effects or browser APIs are required.
- Client components may accept server-rendered children but must not import server-only modules.
- Keep UI-specific server mutations as Server Actions; validate **and authorize** each operation. Protect against duplicate and retried submissions for non-idempotent work.
- Use Waku links/navigation for application routes; do not build another router.

## 4. Public API and internal operations

API files live under `src/pages/_api/`. The `_api` prefix is removed from URLs. For example:

```text
src/pages/_api/api/health.ts           GET /api/health
src/pages/_api/api/bookings/[id].ts    GET/PATCH /api/bookings/:id
```

Group HTTP methods for one resource URL in one file. API routes are explicitly HTTP-shaped and can be called by Flutter, third-party systems and backend services. Server Actions are UI interactions; they do not replace stable public APIs.

Place reusable business operations outside route files (for example `src/features/bookings/` when the feature warrants a folder) so API handlers and Server Actions can call the same implementation. Do **not** round-trip from a server component through the application's own public API merely to invoke internal logic.

Use the standard `Response` API and predictable JSON status/error contracts. OpenAPI and a generated typed client are opt-in, not default complexity.

## 5. Worker bindings and Durable Objects

Import `env` from `cloudflare:workers` only in server-only modules. `src/env.d.ts` extends the typed binding contract in `celld/env.ts`; the runtime and asset bindings are declared in one canonical `wrangler.jsonc`.

```text
Web browser
     |
     v
Waku React SSR / RSC / Server Actions / APIs
     |
     +--- direct Celld bindings (KV, D1, R2, service bindings)
     |
     +--- Postgres / application S3 where authoritative
     |
     +--- service binding -> Hono Worker -> Durable Objects
```

Waku's current Cloudflare integration does **not** support defining Durable Object classes in the Waku Worker. When a feature needs a DO, implement it in a separate Worker (ideally based on [celld-hono](https://github.com/chof64/celld-hono)) and use a Celld service binding to reach it. The sibling can be co-hosted in the same fleet but retains its own script identity.

The Waku Worker is still fully server-capable: it can implement API endpoints, Server Actions and stateless domain logic without delegating all operations to Hono.

## 6. Project layout

```text
project/
├── src/
│   ├── waku.server.tsx         # Native Waku Cloudflare entry
│   ├── pages/                 # Waku file-based routing and API handlers
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── demo.tsx
│   │   └── _api/
│   │       ├── health.ts
│   │       └── api/health.ts
│   ├── components/            # React components
│   ├── env.d.ts               # Worker bindings type augmentation
│   └── styles.css
├── celld/
│   ├── env.ts                 # Explicit Worker allowlist + binding types
│   └── scripts/
│       ├── env.ts             # Shared env loader/selector
│       ├── dev.ts             # Writes .dev.vars + native celld dev
│       ├── deploy.ts          # Native celld deploy wrapper
│       └── package.ts         # Waku-to-Celld packaging experiment
├── tests/
├── waku.config.ts
├── wrangler.jsonc             # Canonical runtime config
├── .env.example
├── .env.prod.example
├── .dev.vars                  # Generated, ignored
└── .wrangler.deploy.jsonc     # Generated, ignored
```

Do not introduce a separate `server/` router, obligatory controller/repository layers, or empty feature directories. Respect Waku's routing defaults even though Hono's endpoint organization is deliberately file-named rather than path-based.

## 7. Application environment and development

Both repositories use the **same** `celld/scripts/env.ts`, `celld/scripts/dev.ts`, and `celld/scripts/deploy.ts` helpers. `.env` is optional locally; the process environment overrides its keys. Only keys in `celld/env.ts` are exported as Worker string variables. Deployment infrastructure credentials are not copied into the Worker.

Commands:

```text
pnpm dev          Waku + Vite development; prepare .dev.vars
pnpm dev:celld    Build Waku and run a production-like local Celld Worker
pnpm typecheck    TypeScript
pnpm test         Unit tests
pnpm check        TypeScript + unit tests
pnpm build        Native Waku production build
pnpm build:celld  Package the Worker for Celld
pnpm deploy       Build + native celld deploy
```

Keep the same CI `ENV_FILE` secret and GitHub Environment contract as the Hono starter. `ENV_FILE` is application-only `KEY=value` content. Node and fleet values belong in the deployment step's environment, not `.env`. The `pnpm deploy` script builds first; both scripts then use the same temporary `.wrangler.deploy.jsonc` and `celld deploy` wrapper.

## 8. Build compatibility warning

The upstream Waku Cloudflare adapter emits multiple JavaScript modules and uses Wrangler `ESModule` discovery rules. Celld's prebuilt `no_bundle: true` deployment requires one bundled JavaScript entry and does not discover Waku's additional JS modules.

The template therefore has an **experimental packaging bridge** from `dist/server/index.js` to `dist/celld/worker.mjs`, while `dist/public` remains the static asset source. Compiling is not sufficient evidence of runtime support: verify Celld can execute SSR/RSC streaming, hydration, Server Actions, API handlers, `cloudflare:workers` imports and all required assets.

See [DEPLOY.md](./DEPLOY.md#waku-compatibility-checklist) for required runtime tests. Never describe the Waku/Celld integration as production-ready until these succeed against pinned versions.

## 9. Production deployment and operations

Use the same [DEPLOY.md](./DEPLOY.md) node/runbook conventions and [GitHub Actions workflow](./.github/workflows/deploy.yml) as the Hono starter: single-node vs multi-node, durability mode, private operator listener, graceful SIGTERM, rolling vs stop-and-update, `ENV_FILE`, pinned `CELLD_VERSION`, dry-run and serialized writes.

Deployment is one application publication per fleet, not a different per-node app deploy. Never change an existing Worker script name or other persistent binding identity as a casual repository rename.

## 10. Decision guide

| Need | Default |
| --- | --- |
| SSR or static web page | Waku route in `src/pages` |
| Browser interactivity | React client component |
| UI-specific mutation | Validated + authorized Waku Server Action |
| External/mobile API | Waku `_api` HTTP handler |
| Runtime bindings | `cloudflare:workers` in server-only code |
| Durable entity / WebSocket hub | Hono/DO Worker via service binding |
| Shared domain logic | Plain TS module imported by handlers/actions |
| Background work | Celld Queue or Workflow, when needed |
| Persistent Xicar domain data | PlanetScale Postgres / application S3 |

The governing rule: **Use Waku for the full-stack React experience and Celld for native runtime capabilities, without hiding HTTP contracts, validation or ownership.**
