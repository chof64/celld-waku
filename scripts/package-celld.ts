import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";

const server = resolve("dist/server/index.js");
const assets = resolve("dist/public");
const output = resolve("dist/celld/worker.mjs");
if (!existsSync(server) || !existsSync(assets)) {
  throw new Error("Expected Waku Cloudflare output at dist/server/index.js and dist/public. Run pnpm build first; inspect Waku's actual output before adjusting this bridge.");
}
mkdirSync(resolve("dist/celld"), { recursive: true });
const result = await build({ entryPoints: [server], outfile: output, bundle: true, splitting: false, format: "esm", platform: "neutral", target: "es2022", packages: "bundle", external: ["cloudflare:workers", "cloudflare:sockets", "node:*"], metafile: true, logLevel: "warning", write: true });
const code = readFileSync(output, "utf8");
const leftover = [...code.matchAll(/(?:import|export)\s*(?:[^'"\n]*?\sfrom\s*)?["']([^"']+)["']/g)].map((match) => match[1]).filter((name) => name.startsWith(".") || name.startsWith("/"));
if (leftover.length) throw new Error(`Celld only deploys one JavaScript entry module; unresolved imports: ${leftover.join(", ")}`);
if (/\bimport\s*\(\s*[^"'\s]/.test(code)) throw new Error("Worker bundle has nonliteral dynamic imports; verify Celld compatibility before deploying.");
writeFileSync(resolve("dist/celld/bundle-report.json"), JSON.stringify({ entry: server, output, inputs: Object.keys(result.metafile!.inputs), externalImports: result.metafile!.outputs[output]?.imports ?? [] }, null, 2));
console.log("Waku Worker packaged for Celld; runtime behavior still requires a Celld smoke test.");
