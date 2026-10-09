# Chat reference application

This repository uses a **real-time React chat** to demonstrate Waku's full-stack model. It speaks the same Hono chat HTTP/WebSocket contract implemented by [celld-hono](https://github.com/chof64/celld-hono). It does not implement a second copy of chat persistence.

## What it demonstrates

- **SSR / React Server Components:** initial room history is loaded directly from the Hono backend in the server-rendered Waku route (not by fetching the Waku app's own HTTP endpoint).
- **Client React:** channel navigation, editable display name, composer, message feed, and reconnect status.
- **Server Actions:** the React composer invokes `src/actions/send-chat-message.ts` with validated input. Its server function sends a request directly to the Hono chat backend.
- **REST API:** Waku also exposes `/api/rooms/:roomId`, `/messages` (GET/POST), and `/socket` as same-origin public routes, proxying to Hono.
- **Durable Objects:** Hono's Room class owns per-room SQLite history and broadcasts new messages via hibernatable WebSockets.
- **Realtime recovery:** the React client reconnects when a socket closes and re-fetches history to cover messages missed while disconnected.

```text
 Browser ───── GET / or /rooms/:id ────> Waku SSR ─┐
   │                                               │
   ├── Submit message ────> Waku Server Action ──┤
   ├── GET/POST /api/rooms/:id/messages ──> Waku API │
   └── WebSocket /api/rooms/:id/socket ───> Waku API ├─> CHAT_SERVICE ─> Hono ─> Room DO
                                                   │      or local backend
                                                   └───────────────────────────────
```

Hono provides the established API:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/rooms/:roomId` | Room snapshot |
| GET | `/api/rooms/:roomId/messages` | Last 100 messages |
| POST | `/api/rooms/:roomId/messages` | Create message and broadcast |
| WebSocket | `/api/rooms/:roomId/socket` | Receive `{type:"message",message}` events |

## Run both repositories locally

Use two terminals and the feature branches containing the current chat examples.

**Terminal 1 — backend:**

```sh
cd celld-hono
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

The Hono Celld Worker listens on `http://127.0.0.1:9876`. Confirm `curl http://127.0.0.1:9876/api/rooms/lobby/messages` returns JSON.

**Terminal 2 — Waku:**

```sh
cd celld-waku
pnpm install
cp .env.example .env
pnpm dev
```

`.env.example` sets `CHAT_BACKEND_URL=http://127.0.0.1:9876`. The Waku dev command copies only allowed application variables to `.dev.vars` before launching the Cloudflare Vite environment.

Open **http://localhost:3000** in two browser windows. Enter a display name and send a message in General. Switch rooms to confirm that the Durable Object room state is isolated. The browser talks to Waku on its own origin; Waku fetches the Hono API server-side. A page opened without the backend renders an explanatory connection error instead of crashing.

**Note:** Waku's Vite/workerd-to-localhost HTTP and WebSocket upgrade forwarding still require an end-to-end run on the selected framework/runtime versions. If these fail, investigate the adapter/network boundary rather than assuming the React chat or Durable Object is defective.

### Testing Waku on Celld rather than workerd

Both Celld starters normally use port 9876 for `celld dev`. To run them simultaneously, keep Hono on 9876 and start Waku's Celld preview on **9877**:

```sh
cd celld-waku
pnpm env:local
pnpm build:celld
celld dev .wrangler.celld.jsonc --port 9877
```

Then visit `http://127.0.0.1:9877`. The existing `CHAT_BACKEND_URL` points to Hono on port 9876. This path also exercises the experimental Waku-to-Celld JS packaging; its compatibility is not yet established.

## Production service binding

For an application composed into one Celld fleet, prefer an internal service binding instead of a remote HTTP URL. The Waku Worker needs a binding named `CHAT_SERVICE` targeting the backend's **Worker script identity**:

```jsonc
{
  "services": [
    { "binding": "CHAT_SERVICE", "service": "celld-boilerplate" }
  ]
}
```

The existing Hono starter retains the historical script name `celld-boilerplate` even after its repository was renamed to `celld-hono`. If the application has never been deployed, it may deliberately choose another name. The `service` value must match that deployed name, not necessarily a GitHub repository name.

Add the binding to the **one canonical root Waku `wrangler.jsonc`** when composing workers. The generated Celld deployment config inherits it. The binding takes precedence over `CHAT_BACKEND_URL`.

**Do not run the two standalone production workflows against the same fleet.** A Celld fleet has a primary application pointer and co-hosted named Worker scripts; use one coordinated composition/deployment pipeline to publish a combined application and its referenced backend script.

## Before production

This is an **unauthenticated public demonstration**. Display names are browser-local and can be impersonated. It has no account-level identity, room authorization, moderation, rate limiting, or duplicate-safe write operation IDs. It should not be exposed as a production messaging feature without adding those protections.

The demo's Durable Object SQLite holds a bounded reference history; it is **not** a substitute for PlanetScale Postgres and application S3 as the authoritative domain persistence for Xicar. Follow the shared [architecture rules](./ARCHITECTURE.md) for business features.

### Manual acceptance checks

1. Verify messages appear in initial HTML/RSC page output when history exists.
2. Open two browser windows, send a message in one and observe the other update without refresh.
3. Confirm the sender sees **one** saved message despite receiving both the Server Action response and WebSocket event.
4. Switch between General, Driver lounge, Dispatch and Support; histories must remain isolated.
5. Stop Hono and observe reconnect status; restart it and confirm history re-sync restores missed messages.
6. POST invalid JSON, blank text and overly long messages to verify the Waku API returns validation errors.
7. Inspect the WebSocket upgrade response. HTTP 101 forwarding from Waku through the chosen runtime to Hono/DO is a specific compatibility requirement, not proven by unit tests.
8. Validate under the real Celld runtime, then test deployment/restart and cross-Worker service bindings.

See the [deployment checklist](./DEPLOY.md#waku-compatibility-checklist) before using Waku on a Celld fleet.
