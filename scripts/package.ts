import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import * as ts from "typescript";

const server = resolve("dist/server/index.js");
const assets = resolve("dist/public");
const output = resolve("dist/celld/worker.mjs");

if (!existsSync(server) || !existsSync(assets)) {
  throw new Error(
    "Expected Waku Cloudflare output at dist/server/index.js and dist/public. Run pnpm build first.",
  );
}

mkdirSync(resolve("dist/celld"), { recursive: true });

const result = await build({
  entryPoints: [server],
  outfile: output,
  bundle: true,
  splitting: false,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  packages: "bundle",
  external: ["cloudflare:workers", "cloudflare:sockets", "node:*"],
  metafile: true,
  logLevel: "warning",
  write: true,
});

const code = readFileSync(output, "utf8");
const parsed = ts.createSourceFile(output, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const unresolvedImports: string[] = [];
const dynamicImports: string[] = [];

function inspectImport(moduleName: string): void {
  if (moduleName.startsWith(".") || moduleName.startsWith("/")) {
    unresolvedImports.push(moduleName);
  }
}

function walk(node: ts.Node): void {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    inspectImport(node.moduleSpecifier.text);
  }

  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const target = node.arguments[0];
    if (target && (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target))) {
      inspectImport(target.text);
    } else {
      const position = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
      dynamicImports.push(`line ${position.line + 1}: ${node.getText(parsed).slice(0, 100)}`);
    }
  }

  ts.forEachChild(node, walk);
}

walk(parsed);

if (unresolvedImports.length > 0) {
  throw new Error(`Celld requires bundled JavaScript; unresolved imports: ${unresolvedImports.join(", ")}`);
}
if (dynamicImports.length > 0) {
  throw new Error(`Worker has nonliteral dynamic imports: ${dynamicImports.join("; ")}`);
}

writeFileSync(
  resolve("dist/celld/bundle-report.json"),
  JSON.stringify({
    entry: server,
    output,
    inputs: Object.keys(result.metafile!.inputs),
    externalImports: result.metafile!.outputs[output]?.imports ?? [],
  }, null, 2),
);
console.log("Waku Worker packaged for Celld; runtime behavior still requires a Celld smoke test.");
