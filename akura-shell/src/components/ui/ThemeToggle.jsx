import { useTheme } from '../../context/ThemeContext'
import { MoonOutlined, SunOutlined } from '../global'

export default function ThemeToggle({ className = '' }) {
  const { mode, toggleTheme } = useTheme()
  const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button type="button" className={`theme-toggle ${className}`} onClick={toggleTheme}
      aria-label={label} title={label} aria-pressed={mode === 'dark'}>
      {mode === 'dark' ? <MoonOutlined aria-hidden="true" /> : <SunOutlined aria-hidden="true" />}
      <span>{mode === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
