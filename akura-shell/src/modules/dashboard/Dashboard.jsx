import { ThunderboltOutlined } from '../../components/global'
import { useAuth } from '../../context/AuthContext'
import './Dashboard.css'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat Pagi'
  if (hour < 17) return 'Selamat Siang'
  return 'Selamat Malam'
}

function Dashboard() {
  const { user } = useAuth()
  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username
    : 'Administrator'

  return (
    <div className="dashboard-page">
      <div className="welcome-banner">
        <div className="welcome-text">
          <div className="welcome-greeting">
            <ThunderboltOutlined className="welcome-icon" />
            {getGreeting()}!
          </div>
          <h2 className="welcome-name">{displayName}</h2>
          <p className="welcome-desc">
            Pantau dan kelola semua aktivitas sistem dari sini. &nbsp;
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="welcome-shapes">
          <div className="ws-1" />
          <div className="ws-2" />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
