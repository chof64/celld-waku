import { spawnSync } from "node:child_process";

const child = spawnSync("tsx", ["celld/scripts/dev.ts"], {
  stdio: "inherit",
  env: { ...process.env, CELLD_APPLICATION_CONFIG: ".wrangler.celld.jsonc" },
});
if (child.error) throw child.error;
process.exitCode = child.status ?? 1;
