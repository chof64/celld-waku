import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { loadEnvironment, selectWorkerEnvironment, serializeDevVars } from "./env";

writeFileSync(".dev.vars", serializeDevVars(selectWorkerEnvironment(loadEnvironment())), { encoding: "utf8", mode: 0o600 });
const built = spawnSync("pnpm", ["build:celld"], { stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);
const child = spawnSync("celld", ["dev", "."], { stdio: "inherit", env: process.env });
process.exit(child.status ?? 1);
