import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'
import { defineConfig, loadEnv } from 'vite'
import federationConfig from './module-federation.config.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const origin = env.AKURA_APP_MANAGER_PUBLIC_URL || 'http://localhost:4174'

  return {
    base: `${origin}/`,
    plugins: [react(), federation(federationConfig)],
    server: { port: 4174, origin, cors: true },
    preview: { port: 4174, cors: true },
    build: { target: 'chrome89' },
  }
})
