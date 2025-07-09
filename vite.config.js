import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // ESSENCIAL

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ESSENCIAL
    },
  },
  server: {
    hmr: {
      clientPort: 5173, 
      protocol: 'ws',
      host: 'localhost'
    }
  },
});