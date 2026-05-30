import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Allow the Cloudflare-tunnel hostname (Vite 5 blocks unknown hosts by default)
    allowedHosts: ['invoicer.jtdownes.com', '.jtdownes.com', 'localhost', '127.0.0.1'],
    // HMR websocket comes back through the https tunnel on 443
    hmr: { clientPort: 443, protocol: 'wss' },
    proxy: {
      '/api': {
        target: 'http://dc-invoice-api:7861',
        changeOrigin: true,
      },
    },
  },
})
