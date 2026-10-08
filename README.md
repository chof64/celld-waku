# Celld + Waku

A **full-stack React** starter for [Celld](https://github.com/denoland/celld), built on [Waku](https://waku.gg/). Its sibling [celld-hono](https://github.com/chof64/celld-hono) is backend-first; this template adds SSR, React Server Components, client components, Server Actions and Waku file-based API routes.

**Compatibility status: experimental.** The official Waku Cloudflare build is not directly deployable to Celld without packaging, and the RSC runtime has not been validated end-to-end on Celld. Do not ship this starter to production until the [smoke-test checklist](./DEPLOY.md#celld-runtime-compatibility-checklist) passes.

## Get started

Requires Node.js >=22.15, pnpm, and (for Celld commands) a Celld CLI matching your deployed fleet version.

```sh
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

Open http://localhost:3000. The default example has a static landing page with an interactive React counter, a dynamic server-rendered binding demo at `/demo`, and a public health endpoint at `/api/health`.

`pnpm dev` uses Waku's Cloudflare Vite plugin and workerd environment. For a production-like Celld build and local runtime, run `pnpm dev:celld`, then visit http://127.0.0.1:9876. This command builds before starting Celld; use `pnpm dev` during ordinary UI iteration.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Waku development server with Vite |
| `pnpm build` | Native Waku production build |
| `pnpm build:celld` | Build Waku, then attempt Celld-compatible one-module packaging |
| `pnpm dev:celld` | Prepare Worker vars, build, and run local Celld |
| `pnpm typecheck` | TypeScript checks |
| `pnpm test` | Tests |
| `pnpm check` | Type checks and tests |
| `pnpm check:celld` | Build and test (not a runtime compatibility proof) |
| `pnpm deploy` | Build and invoke native `celld deploy` |

## Development conventions

Waku's `src/pages` convention is authoritative. Pages use React Server Components by default. Add `export const getConfig = async () => ({ render: 'dynamic' as const })` when server rendering must happen on every request. Put interactive React in `'use client'` components. Waku APIs live in `src/pages/_api` and expose named `GET`, `POST`, etc. handlers; the `_api` segment is stripped from URLs. Validate data with Zod and authorize *both* Server Actions and API mutations.

Read [ARCHITECTURE.md](./ARCHITECTURE.md) for ownership rules and [DEPLOY.md](./DEPLOY.md) for the CI and Celld compatibility process.

## Cloudflare and Celld bindings

Server-only code can import `env` from `cloudflare:workers`, which Celld implements. Add new bindings to `wrangler.jsonc` and their types to `src/env.d.ts`. Add environment string keys to `scripts/env.ts` before passing any from `.env` or CI. Never leak fleet credentials into the Worker.

Waku does **not** currently support defining Durable Object classes inside its own Worker. To use DOs, implement them in a separate Hono Worker (such as one based on celld-hono), deploy it to the same Celld fleet, and communicate through a Celld service binding. This needs separate script identities even if both are co-hosted in one fleet.

## CI

The included [GitHub Actions workflow](./.github/workflows/deploy.yml) runs on pushes to `main` or manual dispatch from `main`. Configure the `production` environment with `CELLD_VERSION`, `CELLD_BUCKET`, `AWS_REGION`, optional `S3_ENDPOINT`, storage credential secrets, and `ENV_FILE` (application variables only). Deployment is serialized and first uses `--dry-run`.
