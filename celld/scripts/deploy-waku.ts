import { spawnSync } from "node:child_process";

const prepared = spawnSync("pnpm", ["build:celld"], { stdio: "inherit" });
if (prepared.error) throw prepared.error;
if (prepared.status !== 0) process.exit(prepared.status ?? 1);

const deployment = spawnSync("tsx", ["celld/scripts/deploy.ts", ...process.argv.slice(2)], { stdio: "inherit" });
if (deployment.error) throw deployment.error;
process.exitCode = deployment.status ?? 1;
