# Celld + Waku

A **full-stack React** starter for [Celld](https://github.com/denoland/celld), using [Waku](https://waku.gg/) for server-rendered pages, React Server Components, client interactivity, Server Actions and API routes.

## Sibling starters

| Starter | Purpose |
| --- | --- |
| **[celld-hono](https://github.com/chof64/celld-hono)** | Backend APIs, Durable Objects and stateful services |
| **[celld-waku](https://github.com/chof64/celld-waku)** (this repository) | Full-stack web UI, SSR/RSC, React, and public API handlers |

Both follow the [same shared architecture principles](./ARCHITECTURE.md#1-shared-architecture-principles), [Celld production runbook](./DEPLOY.md), env allowlist, `ENV_FILE` secret model, and CI workflow. Read [SYNC.md](./SYNC.md) when changing a convention that applies to both.

**Compatibility status: experimental.** Waku's Cloudflare build is not directly deployable to Celld's current prebundled Worker format. We have an experimental packaging bridge, but React Server Components, SSR/hydration, and Server Actions have not yet been verified end-to-end on Celld. Keep this starter out of production until the [Waku compatibility checklist](./DEPLOY.md#waku-compatibility-checklist) passes.

## Get started

Requires Node.js 22.15+ and pnpm. Celld commands additionally require a matching Celld CLI.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:3000`. The Vite/Cloudflare dev server uses local `.dev.vars` generated from the **allowed application variables**, so `GREETING` works in server-side pages. The starter includes a static landing page and React counter, a dynamically server-rendered page at `/demo`, and JSON health APIs at `/health` and `/api/health`.

For a production-like Celld local run instead of Vite/workerd development:

```sh
pnpm dev:celld
```

This prepares allowed vars, builds Waku, packages the server bundle, then invokes **native** `celld dev .` at `http://127.0.0.1:9876`. This path is currently experimental, and build success does not prove runtime compatibility.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Prepare Worker vars and run Waku's Vite development server |
| `pnpm env:local` | Regenerate ignored `.dev.vars` from the application allowlist |
| `pnpm build` | Native Waku production build |
| `pnpm build:celld` | Waku build + experimental single-module Celld packaging |
| `pnpm dev:celld` | Prepare/build then run native Celld |
| `pnpm typecheck` | TypeScript checks |
| `pnpm test` | Unit tests |
| `pnpm check` | Type checks and tests |
| `pnpm check:celld` | Build and tests; not a full runtime compatibility check |
| `pnpm deploy` | Package Waku, inject Worker vars and run native `celld deploy` |

The common environment, development and deployment helpers live under `celld/scripts/`, matching [celld-hono](https://github.com/chof64/celld-hono). Waku adds only its own build/packaging and preparation wrappers.

## Full-stack conventions

- **Pages and layouts:** Waku's `src/pages` filesystem convention. Static by default; export `getConfig` with `render: 'dynamic'` for SSR.
- **Interactive UI:** React modules with `'use client'`. Client components cannot import server-only bindings or credentials.
- **Server Actions:** For web-only mutations. Validate and authorize inputs; handle retries and duplicates.
- **Public API:** `src/pages/_api/` handlers with named HTTP methods. One resource URL per file; group GET/POST/etc. for the same URL. Use RESTful APIs for Flutter, external services, and webhooks.
- **Domain logic:** Keep reusable functions independent of Waku pages, actions and HTTP transport. Do not call your own public API from the server just to reuse business logic.
- **Validation:** Zod as default; Standard Schema where supported.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for boundaries, folder layout and state ownership.

## Celld bindings

Server-side Waku code can import `env` from `cloudflare:workers`. Declare bindings in the root `wrangler.jsonc`, type them in `celld/env.ts` and `src/env.d.ts`, and expose string variables only through the `workerEnvironment` allowlist. `.env.example` and `.env.prod.example` declare the application contract; the process environment overrides `.env`.

Waku does **not currently define Durable Object classes in its own Worker**. Use a separate Hono/DO Worker via a Celld service binding when stateful entity coordination is needed. That Hono Worker can be co-hosted on the same fleet, with its own script identity and migrations.

## Deploy and CI

```sh
pnpm check
pnpm deploy -- --dry-run
pnpm deploy
```

The `production` GitHub Environment requires `CELLD_VERSION`, `CELLD_BUCKET`, `AWS_REGION`, optional `S3_ENDPOINT`, storage credential secrets, and `ENV_FILE` containing application-only `KEY=value` pairs. The deployment scripts use the same `.wrangler.deploy.jsonc` generation and cleanup as Hono and **do not** call `wrangler deploy`.

Read the self-contained [DEPLOY.md](./DEPLOY.md) for Coolify/Docker fleet topology, upgrades, graceful drains, CI setup, and the Waku runtime compatibility checklist. GitHub Actions concurrency alone does not coordinate deployment writers across distinct repositories; use one composed fleet deployment pipeline for Xicar's multi-repository application.

The pnpm lockfile has not yet been generated/validated for the Waku starter, so Waku CI temporarily uses `--no-frozen-lockfile`; Hono correctly retains `--frozen-lockfile`. Restore the frozen setting once the Waku lockfile is committed.
