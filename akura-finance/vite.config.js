import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'
import { defineConfig, loadEnv } from 'vite'
import federationConfig from './module-federation.config.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const origin = env.AKURA_FINANCE_PUBLIC_URL || 'http://localhost:4176'

  return {
    base: `${origin}/`,
    plugins: [react(), federation(federationConfig)],
    server: { port: 4176, origin, cors: true },
    preview: { port: 4176, cors: true },
    build: { target: 'chrome89' },
  }
})
