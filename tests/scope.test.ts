import { readFileSync } from "node:fs";
import { parse } from "jsonc-parser";
import { describe, expect, it } from "vitest";

describe("Waku full-stack starter", () => {
  it("uses native Waku routing in development and a generated Celld entry", () => {
    const config = parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
    expect(config.main).toBe("./src/waku.server.tsx");
    expect(config.assets.directory).toBe("./dist/public");
    expect(config.rules).toContainEqual({ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] });
    const packageScripts = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts;
    expect(packageScripts["build:celld"]).toContain("scripts/config.ts");
    expect(readFileSync(new URL("../.gitignore", import.meta.url), "utf8")).toContain(".wrangler.celld.jsonc");
  });
});
