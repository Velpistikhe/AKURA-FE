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
      colorPrimary: mode === 'dark' ? '#8ba9f4' : '#284b8f',
      colorLink: mode === 'dark' ? '#a8bfff' : '#284b8f',
      colorBgBase: mode === 'dark' ? '#111925' : '#ffffff',
      colorTextBase: mode === 'dark' ? '#e6edf8' : '#20304b',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      borderRadius: 10, borderRadiusLG: 16, controlHeight: 42, fontSize: 14,
      motion: true,
    },
    components: { Button: { fontWeight: 600 }, Menu: { itemHeight: 44 } },
  }), [mode])

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme: () => setMode((value) => value === 'dark' ? 'light' : 'dark') }}>
      <ConfigProvider theme={config} locale={enUS}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
