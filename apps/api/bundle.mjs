import { cpSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { build } from "esbuild";

const OUT = "dist";
const NATIVE = ["@napi-rs/canvas"];
const LOADED_AT_RUNTIME = [{ name: "undici", through: ["ai", "@ai-sdk/provider-utils"] }];
const require = createRequire(import.meta.url);

const packageDir = (name, through = []) => {
  let from = require;
  for (const parent of through) from = createRequire(realpathSync(from.resolve(`${parent}/package.json`)));
  return dirname(realpathSync(from.resolve(`${name}/package.json`)));
};

rmSync(OUT, { recursive: true, force: true });

await build({
  entryPoints: {
    index: "src/index.ts",
    reseal: "src/commands/reseal.ts",
    "reset-password-link": "src/commands/reset-password-link.ts",
  },
  outdir: OUT,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  splitting: true,
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: true,
  sourcesContent: false,
  legalComments: "linked",
  external: [...NATIVE, ...LOADED_AT_RUNTIME.map(({ name }) => name), "pg-native", "bufferutil", "utf-8-validate"],
  banner: {
    js: [
      'import { createRequire as __createRequire } from "node:module";',
      'import { fileURLToPath as __fileURLToPath } from "node:url";',
      "const require = __createRequire(import.meta.url);",
      "const __filename = __fileURLToPath(import.meta.url);",
      'const __dirname = __fileURLToPath(new URL(".", import.meta.url));',
    ].join("\n"),
  },
  logLevel: "warning",
});

for (const name of NATIVE) {
  const scope = dirname(packageDir(name));
  for (const entry of readdirSync(scope)) {
    cpSync(realpathSync(join(scope, entry)), join(OUT, "node_modules", basename(scope), entry), { recursive: true });
  }
}
for (const { name, through } of LOADED_AT_RUNTIME) {
  cpSync(packageDir(name, through), join(OUT, "node_modules", name), { recursive: true });
}
cpSync(join(dirname(require.resolve("@excalidraw/excalidraw")), "fonts"), join(OUT, "fonts"), { recursive: true });
cpSync(join(dirname(require.resolve("@repo/db")), "..", "drizzle"), join(OUT, "drizzle"), { recursive: true });

const bundled = createRequire(resolve(OUT, "index.mjs"));
for (const name of [...NATIVE, ...LOADED_AT_RUNTIME.map(({ name }) => name)]) bundled.resolve(name);
