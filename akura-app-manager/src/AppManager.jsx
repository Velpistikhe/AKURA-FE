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
  { key: 'core', name: 'Akura Core', owner: 'Platform Team', status: 'Aktif', version: '1.0.0' },
  { key: 'identity', name: 'Identity Manager', owner: 'Security Team', status: 'Aktif', version: '1.0.0' },
  { key: 'report', name: 'Report Center', owner: 'Data Team', status: 'Pengembangan', version: '0.8.0' },
]

function AppManagerOverview({ currentUser }) {
  const displayName = currentUser?.firstName || currentUser?.username || 'Administrator'

  return (
    <section className="app-manager-page">
      <div className="app-manager-heading">
        <div>
          <Typography.Title level={2}>Akura App Manager</Typography.Title>
          <Typography.Text tone="secondary">
            Kelola aplikasi dan modul Akura dari satu tempat, {displayName}.
          </Typography.Text>
        </div>
        <Button variant="primary" icon={<AppstoreOutlined />}>Daftarkan aplikasi</Button>
      </div>

      <Row gutter={[16, 16]} className="app-manager-stats">
        <Col xs={24} md={8}>
          <Card><Statistic title="Total aplikasi" value={applications.length} prefix={<AppstoreOutlined />} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Aplikasi aktif" value={2} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Environment" value="Production" prefix={<CloudServerOutlined />} /></Card>
        </Col>
      </Row>

      <Card title="Daftar aplikasi" className="app-manager-list">
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
              <Tag color={application.status === 'Aktif' ? 'success' : 'processing'}>{application.status}</Tag>
              <Button variant="text" icon={<SettingOutlined />} aria-label={`Atur ${application.name}`} />
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
