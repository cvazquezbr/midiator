import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copy } from 'vite-plugin-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    copy([
      {
        from: 'node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',
        to: 'public/ffmpeg',
      },
      {
        from: 'node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',
        to: 'public/ffmpeg',
      },
      {
        from: 'node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.worker.js',
        to: 'public/ffmpeg',
      },
    ]),
  ],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  resolve: {
    alias: {
      "@": `${__dirname}/src`,
    },
  },
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      external: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
      output: {
        manualChunks: {
          ffmpeg: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});


