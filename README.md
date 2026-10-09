# Celld + Waku

A **server-rendered, React full-stack** starter for [Celld](https://github.com/denoland/celld), built with [Waku](https://waku.gg/) for SSR, React Server Components, interactive client components, Server Actions and API routes. Choose it when React rendering and server-side UI workflows are central to the product.

Its reference app is a **real-time chat interface** backed by the Durable Object chat backend in [celld-hono](https://github.com/chof64/celld-hono).

## Two complementary starters

| Starter | Purpose |
| --- | --- |
| **[celld-hono](https://github.com/chof64/celld-hono)** | API-first for web/mobile clients; optional React/Vite SPA, Durable Objects, Queues, Workflows |
| **[celld-waku](https://github.com/chof64/celld-waku)** (this repository) | SSR/RSC-focused React full-stack apps: client UI, Server Actions, public API routes |

Waku **can** serve external/mobile clients through normal HTTP APIs, but the [Hono starter](https://github.com/chof64/celld-hono) is the simpler default when the API is primary and React is just one optional client. Hono also includes its own independent [React/Vite chat example](https://github.com/chof64/celld-hono/blob/refactor/sync-waku-hono-standards/WEB.md) that directly consumes the shared API.

Both share [13 architecture principles](./ARCHITECTURE.md#1-shared-architecture-principles), [Celld deployment operations](./DEPLOY.md), the `ENV_FILE` secret contract, and runtime helper conventions. See [SYNC.md](./SYNC.md) for the cross-repository maintenance contract.

## Chat app

The default homepage is a responsive React chat app with four channels, persisted display-name preference, a message composer, and realtime updates.

- **SSR:** Waku loads the room's initial message history on the server before rendering the page.
- **React + Server Actions:** the browser hydrates the chat, sends through a Waku Server Action, and handles connection status, reconnection and missed-message recovery.
- **REST and WebSocket APIs:** Waku exposes the same room paths as Hono for external clients and live subscriptions; the React composer uses a Server Action instead of its own REST endpoint.
- **Durable Objects:** the separate Hono worker uses a Room Durable Object for message history and WebSocket broadcasts.

```text
Browser / Waku React
     |
     +-- Waku SSR server component -----------+
     +-- Waku Server Action + REST / WS -----+--> CHAT_SERVICE / CHAT_BACKEND_URL
                                                     |
                                                  Hono APIs
                                                     |
                                             Room Durable Object
```

Read [CHAT.md](./CHAT.md) for the complete two-repository quickstart, production service binding example, and realtime acceptance checks.

### Start locally

Requires Node.js 22.15+, pnpm, and the Celld CLI for the Hono backend.

First start **celld-hono** (the matching backend branch):

```sh
cd celld-hono
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Then in a separate terminal start **celld-waku**:

```sh
cd celld-waku
pnpm install
cp .env.example .env
pnpm dev
```

Open **http://localhost:3000** and send a message. For local development, the Waku example's `.env.example` uses `CHAT_BACKEND_URL=http://127.0.0.1:9876`; the browser only uses the Waku origin. For a composed Celld deployment, prefer a `CHAT_SERVICE` service binding.

The frontend still renders when Hono is unavailable and shows a connection error until chat can connect.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Prepare allowed Worker variables and start Waku's Vite/workerd dev server |
| `pnpm env:local` | Write ignored `.dev.vars` from the explicit application allowlist |
| `pnpm build` | Native Waku production build |
| `pnpm build:celld` | Package Waku's Worker as one module for Celld (experimental) |
| `pnpm dev:celld` | Build and start Waku on local Celld, default port 9876 |
| `pnpm typecheck` | Check TypeScript |
| `pnpm test` | Run Vitest unit/contract tests |
| `pnpm check` | Run typecheck and unit tests |
| `pnpm deploy` | Build and invoke native `celld deploy` |

If both Hono and Waku are running on local Celld, use separate ports (see [CHAT.md](./CHAT.md#testing-waku-on-celld-rather-than-workerd)).

## When to choose this starter

Use **Waku** for authenticated server-rendered React layouts, SEO-sensitive pages, React Server Components and Server Actions. Use **Hono** for shared ride-hailing/wallet/messaging APIs, Flutter clients, realtime coordination and optional client-side React apps. These are framework defaults, not restrictions: Waku can serve external REST APIs and Hono can serve compiled SPA assets.

## Development conventions

Use Waku's native `src/pages` for pages, `_layout.tsx` for layouts, `getConfig().render = 'dynamic'` for request-time SSR, and `'use client'` only for browser interactivity.

Waku API endpoints live in `src/pages/_api/`, expose `GET`, `POST`, and other Web API HTTP methods, and keep HTTP methods for the same resource together. Server components call reusable domain operations directly, not the app's own public API. Validate all requests with Zod; a Server Action requires the same authorization rules as any API endpoint.

Server-only modules may access Celld bindings via `cloudflare:workers`. The chat example uses `CHAT_BACKEND_URL` for local Hono development and an optional `CHAT_SERVICE` binding for co-hosted Celld services. Waku does not currently define Durable Object classes inside its own Worker.

The root `wrangler.jsonc` is the **one hand-maintained config**. It points to the Waku source Worker for Vite; the Celld build derives an ignored `.wrangler.celld.jsonc` pointing to the prebundled server entry.

## Production and compatibility

**Waku-to-Celld compatibility is still experimental.** The standard Waku Cloudflare output contains multiple JavaScript modules and cannot be passed directly to Celld's prebundled entrypoint. The package bridge has not been verified end-to-end for RSC streaming, hydration, WebSocket 101 forwarding or Server Actions.

Do not deploy the chat demo publicly as-is: it is unauthenticated and lacks room authorization, moderation, rate limits and write deduplication. See [CHAT.md](./CHAT.md#before-production).

For a production Celld fleet, [DEPLOY.md](./DEPLOY.md) documents single-node/multi-node operation, pinned releases, upgrades, graceful shutdown, GitHub Actions and `ENV_FILE`. **One fleet runs one composed application**: don't independently publish Hono and Waku to a shared fleet. Use one composition/deployment pipeline.

The Waku starter still needs a verified pnpm lockfile and runtime smoke tests before its draft PR can be considered production-ready.
