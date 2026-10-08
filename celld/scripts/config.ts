import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parse, type ParseError, printParseErrorCode } from "jsonc-parser";

const file = "wrangler.jsonc";
const buildOutput = "dist/celld/worker.mjs";
const derivedConfig = ".wrangler.celld.jsonc";

const errors: ParseError[] = [];
const source = parse(readFileSync(file, "utf8"), errors, { allowTrailingComma: true });
if (errors.length > 0 || !source || typeof source !== "object" || Array.isArray(source)) {
  const reason = errors.map((error) => printParseErrorCode(error.error)).join(", ");
  throw new Error(`Cannot parse ${file}: ${reason || "expected an object"}`);
}
if (!existsSync(buildOutput)) throw new Error(`Missing ${buildOutput}; run Waku's build and packaging steps first`);

const { rules: _rules, define: _define, ...config } = source as Record<string, unknown>;
const celldConfig = { ...config, main: `./${buildOutput}`, no_bundle: true };
writeFileSync(derivedConfig, JSON.stringify(celldConfig, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
