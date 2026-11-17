import { Link } from 'react-router-dom'
import { ArrowRightOutlined, DatabaseOutlined, FileTextOutlined, HomeOutlined, SafetyOutlined, TeamOutlined, BarChartOutlined } from '../../components/global'
import { useAuth } from '../../context/AuthContext'
import { useMenu } from '../../context/MenuContext'
import { branchLabel, buildWorkspaceGroups } from './workspaceModel'
import './Dashboard.css'

const workspaceIcons = { team: TeamOutlined, document: FileTextOutlined, inspection: SafetyOutlined, finance: BarChartOutlined, catalog: DatabaseOutlined }

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function Dashboard() {
  const { user } = useAuth()
  const { menus, menuError } = useMenu()
  const displayName = user?.firstName || user?.username || 'there'
  const groups = buildWorkspaceGroups(menus)
  const moduleCount = groups.reduce((count, group) => count + group.links.length, 0)

  return (
    <div className="dashboard-page">
      <header className="workspace-heading">
        <div>
          <p className="workspace-greeting">{getGreeting()}, {displayName}.</p>
          <h1>Your operations workspace</h1>
          <p>Coordinate customer requirements, inspection work, and branch operations.</p>
        </div>
        <time className="workspace-date" dateTime={new Date().toLocaleDateString('en-CA')}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </time>
      </header>

      <div className="workspace-layout">
        <section className="workspace-directory" aria-labelledby="workspace-modules-title">
          <div className="workspace-section-heading">
            <h2 id="workspace-modules-title">Your modules</h2>
            <span>{moduleCount} available</span>
          </div>
          {groups.length ? <div className="workspace-groups">
            {groups.map((group) => {
              const Icon = workspaceIcons[group.icon]
              return <section className="workspace-group" key={group.key} aria-labelledby={`workspace-${group.key}`}>
                <div className="workspace-group-heading">
                  <span className="workspace-group-icon"><Icon aria-hidden="true" /></span>
                  <div><h3 id={`workspace-${group.key}`}>{group.title}</h3><p>{group.description}</p></div>
                </div>
                <ul>{group.links.map((link) => <li key={link.path}>
                  <Link to={link.path}><span>{link.label}</span><ArrowRightOutlined aria-hidden="true" /></Link>
                </li>)}</ul>
              </section>
            })}
          </div> : <div className="workspace-empty" role="status">
            <h3>{menuError ? 'Your modules could not be loaded' : 'No modules assigned yet'}</h3>
            <p>{menuError ? 'Use Try Again in the navigation to reload your menu.' : 'Contact your administrator to arrange access to the modules you need.'}</p>
          </div>}
        </section>

        <aside className="workspace-context" aria-labelledby="workspace-context-title">
          <div className="workspace-context-heading"><HomeOutlined aria-hidden="true" /><h2 id="workspace-context-title">Workspace context</h2></div>
          <dl>
            <div><dt>Office branch</dt><dd>{branchLabel(user)}</dd></div>
            <div><dt>Role</dt><dd>{user?.role?.replaceAll('_', ' ') || 'Not assigned'}</dd></div>
            <div><dt>Section</dt><dd>{user?.section?.replaceAll('_', ' ') || 'Not assigned'}</dd></div>
          </dl>
          <p>Contact your administrator if your branch assignment or module access needs updating.</p>
          <Link className="workspace-profile-link" to="/dashboard/profile">View your profile <ArrowRightOutlined aria-hidden="true" /></Link>
        </aside>
      </div>
    </div>
  )
}

export default Dashboard
