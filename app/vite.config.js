import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['crewbill.app', 'localhost', '127.0.0.1'],
    hmr: { clientPort: 443, protocol: 'wss' },
    proxy: {
      '/api': {
        target: 'http://dc-invoicer-api:7861',
        changeOrigin: true,
      },
    },
  },
})
