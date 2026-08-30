import { createModuleFederationConfig } from '@module-federation/vite'

export default createModuleFederationConfig({
  name: 'akura_marketing',
  dts: false,
  filename: 'remoteEntry.js',
  manifest: true,
  exposes: {
    './MarketingApp': './src/MarketingApp.jsx',
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
