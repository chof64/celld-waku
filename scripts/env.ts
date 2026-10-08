import { existsSync, readFileSync } from "node:fs";
import { parse as parseDotEnv } from "dotenv";

export const workerEnvironment = { required: [] as const, optional: ["GREETING"] as const };
type Source = Record<string, string | undefined>;

export function loadEnvironment(filename = ".env", system: Source = process.env): Source {
  return { ...(existsSync(filename) ? parseDotEnv(readFileSync(filename)) : {}), ...system };
}

export function selectWorkerEnvironment(source: Source): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const name of workerEnvironment.required) {
    const value = source[name];
    if (!value) throw new Error(`Missing required Worker variable: ${name}`);
    selected[name] = value;
  }
  for (const name of workerEnvironment.optional) {
    const value = source[name];
    if (value !== undefined && value !== "") selected[name] = value;
  }
  return selected;
}

export function serializeDevVars(vars: Record<string, string>): string {
  return Object.entries(vars).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => {
    if (/[\r\n]/.test(value)) throw new Error(`Worker variable ${key} contains a newline`);
    return `${key}=${JSON.stringify(value)}`;
  }).join("\n") + (Object.keys(vars).length ? "\n" : "");
}
