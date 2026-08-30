import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'
import { defineConfig, loadEnv } from 'vite'
import { createShellFederationConfig } from './module-federation.config.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const remoteEntry = env.AKURA_APP_MANAGER_REMOTE_URL
    || 'http://localhost:4174/remoteEntry.js'
  const marketingEntry = env.AKURA_MARKETING_REMOTE_URL
    || 'http://localhost:4175/remoteEntry.js'

  return {
    plugins: [react(), federation(createShellFederationConfig(remoteEntry, marketingEntry))],
    server: { port: 4173 },
    preview: { port: 4173 },
    build: { target: 'chrome89' },
  }
})
