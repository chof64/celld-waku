import { spawnSync } from "node:child_process";

const prepared = spawnSync("pnpm", ["build:celld"], { stdio: "inherit" });
if (prepared.error) throw prepared.error;
if (prepared.status !== 0) process.exit(prepared.status ?? 1);

const flags = process.argv.slice(2);
if (flags[0] === "--") flags.shift();
const deployment = spawnSync("tsx", ["scripts/deploy.ts", ...flags], {
  stdio: "inherit",
  env: { ...process.env, CELLD_APPLICATION_CONFIG: ".wrangler.celld.jsonc" },
});
if (deployment.error) throw deployment.error;
process.exitCode = deployment.status ?? 1;
