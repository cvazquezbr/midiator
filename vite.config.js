import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
  ],

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval'",
    },
  },
  // Opcional, mas recomendado para otimizar o build de produção
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
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


