import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// DOMANI web — Cloudflare Pages (build estático en dist/)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
});
