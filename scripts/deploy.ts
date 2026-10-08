import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { parse, type ParseError, printParseErrorCode } from "jsonc-parser";
import { loadEnvironment, selectWorkerEnvironment } from "./env";

const temp = ".wrangler.deploy.jsonc";
const errors: ParseError[] = [];
const config = parse(readFileSync("wrangler.jsonc", "utf8"), errors, { allowTrailingComma: true });
if (errors.length || !config || typeof config !== "object" || Array.isArray(config)) throw new Error(`Invalid wrangler.jsonc: ${errors.map((error) => printParseErrorCode(error.error)).join(", ")}`);
const env = loadEnvironment();
const workerVars = selectWorkerEnvironment(env);
const built = spawnSync("pnpm", ["build:celld"], { stdio: "inherit", env: process.env });
if (built.status !== 0) process.exit(built.status ?? 1);
try {
  writeFileSync(temp, JSON.stringify({ ...config, vars: { ...(config.vars ?? {}), ...workerVars } }, null, 2), { encoding: "utf8", mode: 0o600 });
  const deployed = spawnSync("celld", ["deploy", "--config", temp, ...process.argv.slice(2)], { stdio: "inherit", env: process.env });
  process.exitCode = deployed.status ?? 1;
} finally {
  rmSync(temp, { force: true });
}
