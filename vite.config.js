import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copy } from 'vite-plugin-copy'

export default defineConfig({
  plugins: [
    react(),
    copy({
      targets: [
        {
          src: 'node_modules/pdfjs-dist/build/pdf.worker.mjs',
          dest: 'public/',
        },
      ],
      // This ensures the copy happens during development as well
      hook: 'buildStart'
    }),
  ],
  
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  
  build: {
    target: 'esnext',
    assetsInclude: ['**/*.wasm'],
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.wasm')) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  
  worker: {
    format: 'es'
  },
  
  define: {
    global: 'globalThis'
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.js',
    // Exclude Playwright tests from the Vitest runner
    exclude: ['**/node_modules/**', '**/dist/**', '**/test/isolated.e2e.test.js'],
  },
})