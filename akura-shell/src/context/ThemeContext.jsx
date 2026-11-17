import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ConfigProvider, enUS, theme as antdTheme } from '../components/global'

const ThemeContext = createContext(null)
const storageKey = 'akura-theme'

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved === 'light' || saved === 'dark') return saved
    } catch { /* Storage may be unavailable in private browsing. */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    document.documentElement.style.colorScheme = mode
    try { localStorage.setItem(storageKey, mode) } catch { /* Keep the in-memory preference. */ }
  }, [mode])

  useEffect(() => {
    const sync = (event) => {
      if (event.key === storageKey && ['light', 'dark'].includes(event.newValue)) setMode(event.newValue)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const config = useMemo(() => ({
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: mode === 'dark' ? '#a3c2ef' : '#25456c',
      colorLink: mode === 'dark' ? '#a3c2ef' : '#254f7b',
      colorError: mode === 'dark' ? '#ff9ca5' : '#bb303e',
      colorBgBase: mode === 'dark' ? '#172639' : '#ffffff',
      colorBgContainer: mode === 'dark' ? '#172639' : '#ffffff',
      colorBgElevated: mode === 'dark' ? '#172639' : '#ffffff',
      colorText: mode === 'dark' ? '#e8eff6' : '#213449',
      colorTextSecondary: mode === 'dark' ? '#a6b7c7' : '#536679',
      colorTextDescription: mode === 'dark' ? '#a6b7c7' : '#536679',
      colorTextPlaceholder: mode === 'dark' ? '#a6b7c7' : '#637487',
      colorBorder: mode === 'dark' ? '#34465b' : '#d7dfe5',
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      borderRadius: 6, borderRadiusLG: 10, controlHeight: 44, fontSize: 14,
      motion: true,
    },
    components: {
      Button: { fontWeight: 500, primaryColor: mode === 'dark' ? '#13233a' : '#ffffff' },
      Menu: { itemHeight: 44 },
      Table: { headerBg: mode === 'dark' ? '#1c2e42' : '#f5f7f8', headerColor: mode === 'dark' ? '#a6b7c7' : '#536679', cellPaddingBlock: 14 },
    },
  }), [mode])

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme: () => setMode((value) => value === 'dark' ? 'light' : 'dark') }}>
      <ConfigProvider theme={config} locale={enUS}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
