import { createModuleFederationConfig } from '@module-federation/vite'

export default createModuleFederationConfig({
  name: 'akura_app_manager',
  dts: false,
  filename: 'remoteEntry.js',
  manifest: true,
  exposes: {
    './AppManager': './src/AppManager.jsx',
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
