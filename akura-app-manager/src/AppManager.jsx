import {
  App,
  AppstoreOutlined,
  Button,
  Card,
  CheckCircleOutlined,
  CloudServerOutlined,
  Col,
  Row,
  SettingOutlined,
  Space,
  Statistic,
  Tag,
  Typography,
} from './components/global'
import MenuModule from './modules/menu/MenuModule'
import UserPage from './modules/user/UserPage'
import './AppManager.css'

const applications = [
  { key: 'core', name: 'Akura Core', owner: 'Platform Team', status: 'Active', version: '1.0.0' },
  { key: 'identity', name: 'Identity Manager', owner: 'Security Team', status: 'Active', version: '1.0.0' },
  { key: 'report', name: 'Report Center', owner: 'Data Team', status: 'In Development', version: '0.8.0' },
]

function AppManagerOverview({ currentUser }) {
  const displayName = currentUser?.firstName || currentUser?.username || 'Administrator'

  return (
    <section className="app-manager-page">
      <div className="app-manager-heading">
        <div>
          <Typography.Title level={2}>Akura App Manager</Typography.Title>
          <Typography.Text tone="secondary">
            Manage Akura applications and modules from one place, {displayName}.
          </Typography.Text>
        </div>
        <Button variant="primary" icon={<AppstoreOutlined />}>Register Application</Button>
      </div>

      <Row gutter={[16, 16]} className="app-manager-stats">
        <Col xs={24} md={8}>
          <Card><Statistic title="Total Applications" value={applications.length} prefix={<AppstoreOutlined />} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Active Applications" value={2} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Environment" value="Production" prefix={<CloudServerOutlined />} /></Card>
        </Col>
      </Row>

      <Card title="Application List" className="app-manager-list">
        {applications.map((application) => (
          <div className="app-manager-item" key={application.key}>
            <Space size="middle">
              <div className="app-manager-icon"><AppstoreOutlined /></div>
              <div>
                <Typography.Text strong>{application.name}</Typography.Text>
                <div className="app-manager-meta">{application.owner} · v{application.version}</div>
              </div>
            </Space>
            <Space>
              <Tag color={application.status === 'Active' ? 'success' : 'processing'}>{application.status}</Tag>
              <Button variant="text" icon={<SettingOutlined />} aria-label={`Configure ${application.name}`} />
            </Space>
          </div>
        ))}
      </Card>
    </section>
  )
}

function AppManager({ currentUser, pathname = window.location.pathname }) {
  const normalizedPath = pathname.replace(/\/+$/, '')
  let content = <AppManagerOverview currentUser={currentUser} />

  if (normalizedPath.endsWith('/appmanager/menu')) {
    content = <MenuModule />
  } else if (/\/appmanager\/users?$/.test(normalizedPath)) {
    content = <UserPage />
  }

  return <App>{content}</App>
}

export default AppManager
