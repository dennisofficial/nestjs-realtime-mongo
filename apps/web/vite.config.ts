import ts from 'typescript';
import { defineConfig } from 'vite';
import { vitePluginTypescriptTransform } from 'vite-plugin-typescript-transform';

export default defineConfig({
  plugins: [
    vitePluginTypescriptTransform({
      enforce: 'pre',
      filter: {
        files: {
          include: /\.ts$/,
        },
      },
      tsconfig: {
        override: {
          target: ts.ScriptTarget.ES2021,
        },
      },
    }),
  ],
});
