import { defineConfig } from 'tsup';
// @ts-ignore
import packageJSON from './package.json';

export default defineConfig({
  outDir: 'dist',
  format: ['cjs', 'esm'],
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.json',
  dts: true,
  shims: true,
  skipNodeModulesBundle: true,
  clean: true,
});
