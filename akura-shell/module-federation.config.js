import { createModuleFederationConfig } from '@module-federation/vite'

export function createShellFederationConfig(appManagerEntry, marketingEntry) {
  return createModuleFederationConfig({
    name: 'akura_shell',
    dts: false,
    remotes: {
      akuraAppManager: {
        type: 'module',
        name: 'akura_app_manager',
        entry: appManagerEntry,
      },
      akuraMarketing: {
        type: 'module',
        name: 'akura_marketing',
        entry: marketingEntry,
      },
    },
    shared: {
      react: { singleton: true },
      'react/': { singleton: true },
      'react-dom': { singleton: true },
      'react-dom/': { singleton: true },
      antd: { singleton: true },
      '@ant-design/icons': { singleton: true },
    },
  })
}
