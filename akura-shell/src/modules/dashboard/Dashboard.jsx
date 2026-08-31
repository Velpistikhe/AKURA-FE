import { ThunderboltOutlined } from '../../components/global'
import { useAuth } from '../../context/AuthContext'
import './Dashboard.css'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
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
            Monitor and manage all system activity from here. &nbsp;
            {new Date().toLocaleDateString('en-US', {
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
