import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // Importar o módulo path

export default defineConfig({
  plugins: [react()],
  resolve: { // Adicionar esta seção
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    hmr: {
      clientPort: 5173,
      protocol: 'ws',
      host: 'localhost'
    }
  },
  // A seção headers parece ser uma tentativa de configurar CSP,
  // mas headers de desenvolvimento no Vite geralmente são para o servidor de desenvolvimento
  // e não afetam o build de produção diretamente dessa forma.
  // A Vercel tem sua própria maneira de configurar headers (vercel.json).
  // Vou manter por enquanto, mas pode ser revisado.
  headers: {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws://localhost:5173 wss://localhost:5173 http://localhost:5173; style-src 'self' 'unsafe-inline'"
  }
})