# Architecture

This starter is a full-stack React application using Waku for the application framework and Celld for Workers execution. Follow Waku conventions instead of inventing a parallel framework. The sibling [celld-hono](https://github.com/chof64/celld-hono) starter is backend-first.

## Principles

1. **Waku owns the web application.** File-based pages, layouts, React Server Components, client components, API routes, and Server Actions remain native Waku.
2. **Celld owns the runtime.** Use Cloudflare-compatible bindings from `cloudflare:workers`; never emulate a new application SDK.
3. **Preserve a stable public boundary.** Browser-only UI mutations may use Server Actions. External/mobile consumers and webhooks use explicit RESTful API routes.
4. **Server-only logic stays server-side.** Never import secret bindings, credentials, database clients, or privileged functions into `'use client'` modules.
5. **Validate inputs and authorize each mutation.** A Server Action is a public server entrypoint just like an API handler; check identity and authorization before side effects.
6. **Isolate durable coordination.** Waku currently does not define Durable Object classes in its Worker; use a co-hosted Hono Worker through a Celld service binding for DO-backed features.
7. **Persist authoritative data outside Celld for Xicar.** PlanetScale Postgres and application S3 are sources of truth; Celld KV/DO data is rebuildable unless a domain explicitly designs otherwise.
8. **Keep application and infrastructure secrets separate.** Declare Worker variables explicitly; never copy the full CI/host environment into Worker bindings.
9. **One canonical root `wrangler.jsonc`.** Development and production use the same binding identities; no environment-specific copies. No implicit staging baseline.
10. **Native Celld commands remain visible.** Build tooling prepares Waku artifacts; `celld dev` and `celld deploy` execute the Worker.
11. **Keep source organization minimal.** Add feature folders, workflows, queues, or service bindings when requirements justify them.

## Stack

Waku / React 19 / TypeScript / Vite for the full-stack UI, Zod for schemas, Celld for Worker runtime and bindings. Use the standard Web `Request`/`Response` APIs for external endpoints. No obligatory ORM, auth framework, UI kit, or extra state store.

## Code layout

```text
src/
  waku.server.tsx           Waku Cloudflare adapter entry
  pages/
    _layout.tsx             Shared layout
    index.tsx               Static React Server Component page
    demo.tsx                Dynamic SSR page reading a Worker binding
    _api/
      api/health.ts         GET /api/health
      health.ts             GET /health
  components/
    counter.tsx             Client-only interaction via 'use client'
  styles.css
scripts/
  env.ts                   Explicit env allowlist
  package-celld.ts         Bundle generated Waku Worker into one module
  dev-celld.ts             Production-like local Celld run
  deploy.ts                Wrapper around native celld deploy
tests/
wrangler.jsonc             Canonical app/binding configuration
waku.config.ts             Waku/Cloudflare Vite integration
```

## Page and API conventions

Waku maps `src/pages` to URLs. Use `_layout.tsx` for layouts, `[id].tsx` for dynamic segments, `getConfig().render = 'dynamic'` for SSR, and `'use client'` for interactive components. Static prerendering is the default.

Under `src/pages/_api`, export named HTTP method handlers. This folder's prefix is removed from the public URL. For example `src/pages/_api/api/bookings/[id].ts` maps to `/api/bookings/:id`. Keep methods on the same URL in one file. Reuse domain services in both Waku handlers and Server Actions; don't call an application's own public endpoint from its server component merely to reuse logic.

## Boundaries

```text
Browser
  |  SSR pages / RSC / Server Actions / GET /api/*
  v
Waku Worker on Celld
  |-- direct bindings (KV, D1, R2, services) when appropriate
  |-- Postgres / application S3 for authoritative persistence
  +-- service binding -> Hono Worker -> Durable Objects for coordination
```

A client component cannot directly access Worker bindings. A server component, Server Action or API route can import `env` from `cloudflare:workers`. Do not configure a Durable Object binding until a separate DO service and its script identity are defined.

## Build and deployment caveat

Waku's Cloudflare adapter outputs multiple JavaScript modules; Celld currently supports one bundled JavaScript entry for `no_bundle: true` and does not accept Waku's `ESModule` discovery rules. `scripts/package-celld.ts` bundles `dist/server/index.js` to `dist/celld/worker.mjs` with esbuild, leaving browser assets in `dist/public`.

**This packaging is experimental and not yet proven compatible with Waku's RSC runtime on Celld.** A successful build or dry-run is insufficient. Confirm real SSR, hydration, client navigation, Server Actions, APIs, asset requests and deployment restarts on the exact Celld version before production. If Waku changes the server output structure, update this bridge rather than bypassing its checks. Do not assume `cloudflare:workers` dynamic imports, Node ALS, or streaming work solely because they compile.

## Environments and operations

Local application values are in `.env`, with templates `.env.example` and `.env.prod.example`. Production CI passes application variables in `ENV_FILE` and Celld fleet credentials separately. The explicit allowlist in `scripts/env.ts` is the only route into Worker `vars` in deployment. `pnpm dev` is the fast Waku dev server; `pnpm dev:celld` builds artifacts and runs native Celld, without hot reload. `pnpm deploy` packages the app, injects only allowed variables into a temporary ignored Wrangler file, and invokes `celld deploy`.

Copy the operational fleet/node configuration from [DEPLOY.md](./DEPLOY.md), not from this application’s secrets. Keep Worker name, service names, KV identities and DO migrations stable after deployment.
