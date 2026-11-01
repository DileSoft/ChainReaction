import { defineConfig } from 'vite';

export default defineConfig({
  // относительный base: сборка работает и в корне домена, и в подпапке
  // (GitHub Pages отдаёт проект по /ChainReaction/)
  base: './',
  server: {
    open: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
});
