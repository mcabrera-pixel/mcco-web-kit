import { defineConfig } from 'astro/config';
export default defineConfig({
  outDir: process.env.ESTANDAR_ASTRO_SALIDA || './dist',
  publicDir: './public',
  vite: { build: { assetsInlineLimit: 0 } },
  build: { format: 'file', inlineStylesheets: 'never' },
});
