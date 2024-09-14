import { defineConfig } from "tsup";

export default defineConfig({
  outDir: "dist",
  format: ["cjs", "esm"],
  entry: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  dts: true,
  clean: true,
  bundle: true,
});
