import { Spin } from '../global'
import './AppLoading.css'

function AppLoading({ message = 'Memuat...', fullScreen = true }) {
  return (
    <div
      className={`app-loading${fullScreen ? ' app-loading-full-screen' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <Spin size="large" />
      <span className="app-loading-message">{message}</span>
    </div>
  )
}

export default AppLoading
