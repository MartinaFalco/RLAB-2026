import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Si el sitio se publica en GitHub Pages bajo https://usuario.github.io/repo/
  // definir VITE_BASE_PATH=/repo/ antes de `npm run build`.
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    port: 4173,
  },
})
