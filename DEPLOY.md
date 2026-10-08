# Deploy Celld Waku

Follow [Celld's node deployment instructions](https://github.com/denoland/celld/blob/main/docs/README.md) and the shared single-node/multi-node runbook in [celld-hono](https://github.com/chof64/celld-hono/blob/main/DEPLOY.md). This file covers application deployment and Waku-specific validation, not fleet administration.

## Deployment contract

Use the official pinned `ghcr.io/denoland/celld` image to run Celld on Coolify or another container platform; bind the public listener inside the container to `0.0.0.0:8080`. Keep the internal listener private. Single node typically uses `CELLD_DURABILITY=bucket` and a loopback internal listener; multi-node uses `CELLD_DURABILITY=fleet`, a private reachable internal listener and `CELLD_ADVERTISE`. Do not explicitly set `CELLD_NODE` unless necessary.

This repo deploys application code *to a running fleet*, not the Celld container image itself. Keep the Celld CLI aligned with the fleet version.

## Local

```sh
pnpm install
cp .env.example .env
pnpm dev
```

To exercise the Celld runtime rather than workerd:

```sh
pnpm dev:celld
```

Celld local data is stored under `.celld/dev`. Do not reset it by default.

## Production

```sh
pnpm check
pnpm deploy -- --dry-run
pnpm deploy
```

The deployment script builds Waku, bundles its server JS for Celld, reads `.env` plus process env, selects only declared Worker vars, writes a restricted `.wrangler.deploy.jsonc`, invokes `celld deploy --config ...`, then removes the temporary file. Do not use `wrangler deploy` for Celld.

## GitHub Actions

The production workflow uses `ENV_FILE` as a secret containing application key=value pairs and never fleet credentials. Configure GitHub Environment `production`:

- Variables: `CELLD_VERSION`, `CELLD_BUCKET`, `AWS_REGION`, optional `S3_ENDPOINT`.
- Secrets: `ENV_FILE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `AWS_SESSION_TOKEN`.

Align `CELLD_VERSION` with the fleet release. Workflow runs tests, validates the Waku packaging, writes `.env` with restricted permissions, performs `--dry-run`, then deploys. Avoid committing secrets or generated deployment configs.

## Celld runtime compatibility checklist

Before the first production use, validate all these against the **exact installed Waku, React and Celld versions**:

1. `pnpm build:celld` completes and `dist/celld/worker.mjs` contains no unresolved sibling module imports.
2. `pnpm dev:celld` starts on the real Celld runtime without module/AsyncLocalStorage errors.
3. `GET /` displays SSR or prerendered content, serves styles and client JS, and hydrates the counter.
4. `GET /demo` renders the `GREETING` Worker binding dynamically after changing `.env` and rebuilding.
5. `GET /api/health` and `GET /health` return JSON, not asset fallback HTML.
6. Client-side Waku navigation and a representative Server Action work across requests.
7. Streaming RSC responses work during navigation without broken browser hydration or asset fetches.
8. Celld redeploys and node restarts do not break pages, asset lookup or active application sessions.
9. Exercise at least one configured service binding to a Hono/DO Worker before relying on it.

A build, TypeScript pass or `celld deploy --dry-run` is **not** proof of runtime compatibility. Waku's documented Cloudflare `ESModule` rules are unsupported in Celld and Celld only discovers a single JavaScript entry on prebundled deploys. Review output and fail safely on any mismatch.

## References

- [Waku Cloudflare guide](https://waku.gg/guides/cloudflare)
- [Celld Cloudflare compatibility](https://github.com/denoland/celld/blob/main/docs/cloudflare-compat.md)
- [Celld prebuilt Worker restrictions](https://github.com/denoland/celld/blob/main/docs/wasm.md)
- [Celld-hono infrastructure runbook](https://github.com/chof64/celld-hono/blob/main/DEPLOY.md)
