import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Empty,
  Layout,
  Menu,
  Tooltip,
  ApiOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FolderOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  QuestionCircleOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '../components/global'
import AkuraLogo from '../components/brand/AkuraLogo'
import { useAuth } from '../context/AuthContext'
import { useMenu } from '../context/MenuContext'
import { useNotification } from '../context/NotificationContext'
import {
  AppAvatar,
  AppDropdown,
  AppBadge,
  AppBreadcrumb,
  AppButton,
  AppLoading,
} from '../components/ui'
import './DashboardLayout.css'
import './DashboardLayout.dynamic.css'

const { Header, Sider, Content } = Layout

const MENU_ICONS = {
  api: ApiOutlined,
  apps: AppstoreOutlined,
  analytics: BarChartOutlined,
  chart: BarChartOutlined,
  dashboard: DashboardOutlined,
  database: DatabaseOutlined,
  document: FileTextOutlined,
  documents: FileTextOutlined,
  file: FileTextOutlined,
  folder: FolderOutlined,
  help: QuestionCircleOutlined,
  home: HomeOutlined,
  integration: ApiOutlined,
  profile: ProfileOutlined,
  report: BarChartOutlined,
  reports: BarChartOutlined,
  security: SafetyOutlined,
  settings: SettingOutlined,
  team: TeamOutlined,
  teams: TeamOutlined,
  user: UserOutlined,
  users: TeamOutlined,
}

function resolveMenuIcon(name) {
  const normalized = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')

  const aliases = {
    'appstore-outlined': 'apps',
    'bar-chart': 'chart',
    'file-text': 'file',
    'layout-dashboard': 'dashboard',
    'question-circle': 'help',
    'safety-outlined': 'security',
  }
  const Icon = MENU_ICONS[aliases[normalized] || normalized] || AppstoreOutlined
  return <Icon />
}

function resolveMenuPath(menuKey, itemKey) {
  const segments = [menuKey, itemKey]
    .map((key) => String(key || '').trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
  return segments.length ? `/${segments.join('/')}` : ''
}

function translateMenuLabel(label) {
  const translations = {
    'Beranda': 'Home',
    'Profil Saya': 'My Profile',
    'Pengaturan': 'Settings',
    'Pengelolaan User': 'User Management',
    'Kelola User': 'Manage Users',
    'Pengguna': 'Users',
    'Manajemen Menu': 'Menu Management',
    'Manajemen Menu Item': 'Menu Item Management',
    'Akses Menu': 'Menu Access',
    'Access Menu': 'Menu Access',
    'Kelola Company': 'Manage Companies',
    'Pengelolaan Company': 'Company Management',
    'Kelola Service': 'Manage Services',
    'Pengelolaan Service': 'Service Management',
    'Kelola Maintenance': 'Manage Maintenance',
    'Pengelolaan Maintenance': 'Maintenance Management',
    'Perusahaan': 'Companies',
    'Layanan': 'Services',
  }
  return translations[label] || label
}

function mapMenus(menus) {
  const dashboardMenu = {
    key: '/dashboard',
    label: 'Dashboard',
    icon: <DashboardOutlined />,
  }

  if (!Array.isArray(menus)) return [dashboardMenu]

  const responseMenus = [...menus]
    .filter((menu) => String(menu.key || '').trim() !== 'dashboard')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((menu) => {
      const menuPath = resolveMenuPath(menu.key)
      const base = {
        key: menu.hasItem ? `group:${menu.key}` : menuPath,
        label: translateMenuLabel(menu.label),
        icon: resolveMenuIcon(menu.key),
      }

      if (!menu.hasItem) return base

      const children = Array.isArray(menu.items)
        ? [...menu.items]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((item) => ({
              key: resolveMenuPath(menu.key, item.key),
              label: translateMenuLabel(item.label),
              icon: resolveMenuIcon(item.key),
            }))
            .filter((item) => item.key && item.label)
        : []

      return { ...base, children }
    })
    .filter((menu) => menu.key && menu.label && (!menu.children || menu.children.length > 0))

  return [dashboardMenu, ...responseMenus]
}

function findActiveMenu(menuItems, pathname) {
  for (const group of menuItems) {
    if (!group.children && group.key === pathname) {
      return { groupKey: null, label: group.label }
    }
    const activeItem = group.children?.find((item) => item.key === pathname)
    if (activeItem) return { groupKey: group.key, label: activeItem.label }
  }
  return null
}

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [openMenuKeys, setOpenMenuKeys] = useState([])
  const [loggingOut, setLoggingOut] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { menus, menuError, loadMenus } = useMenu()
  const notify = useNotification()
  const menuItems = useMemo(() => mapMenus(menus), [menus])

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      const responseMessage = await logout()
      notify.success('Logout Successful', responseMessage || 'You have signed out successfully.')
    } catch (error) {
      notify.error('Logout Failed', error.response?.data?.message || error.message || 'Unable to sign out.')
    } finally {
      window.location.replace('/')
    }
  }

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username
    : 'Admin'

  const siderWidth = collapsed ? 80 : 240
  const activeMenu = findActiveMenu(menuItems, location.pathname)
  const staticLabels = {
    '/dashboard/profile': 'My Profile',
    '/dashboard/settings': 'Account Settings',
  }
  const currentLabel = activeMenu?.label
    || staticLabels[location.pathname]
    || (location.pathname.startsWith('/dashboard/user/') ? 'My Profile' : 'Dashboard')
  const visibleOpenMenuKeys = activeMenu?.groupKey && !openMenuKeys.includes(activeMenu.groupKey)
    ? [...openMenuKeys, activeMenu.groupKey]
    : openMenuKeys

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'My Profile' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true },
  ]

  const handleUserMenu = ({ key }) => {
    if (key === 'logout') handleLogout()
    else if (key === 'profile') navigate('/dashboard/profile')
    else if (key === 'settings') navigate('/dashboard/settings')
  }

  if (loggingOut) return <AppLoading message="Signing out..." />

  return (
    <Layout className="dashboard-root">
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <Sider
        collapsed={collapsed}
        collapsedWidth={isMobile ? 0 : 80}
        width={isMobile ? 240 : siderWidth}
        className={`dashboard-sider ${mobileOpen ? 'mobile-sider-open' : ''}`}
        breakpoint="md"
        onBreakpoint={(broken) => { if (broken) { setCollapsed(false); setMobileOpen(false) } }}
      >
        <div className={`sider-logo ${collapsed && !isMobile ? 'sider-logo-collapsed' : ''}`}>
          <AkuraLogo
            inverse
            size={48}
            showWordmark={!collapsed || isMobile}
          />
        </div>

        <div className="sider-menu-wrapper">
          {menuError ? (
            <div className="sider-menu-state">
              <span>Unable to load the menu.</span>
              <AppButton
                id="btn-reload-menu"
                size="small"
                onClick={() => loadMenus()}
              >
                Try Again
              </AppButton>
            </div>
          ) : menuItems.length === 0 ? (
            <Empty
              className="sider-menu-empty"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No menu available"
            />
          ) : (
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[location.pathname]}
              openKeys={visibleOpenMenuKeys}
              items={menuItems}
              onOpenChange={setOpenMenuKeys}
              onClick={({ key }) => {
                setMobileOpen(false)
                navigate(key)
              }}
              className="sider-menu"
              inlineCollapsed={collapsed && !isMobile}
            />
          )}
        </div>

        <div className={`sider-user ${collapsed && !isMobile ? 'sider-user-collapsed' : ''}`}>
          <AppAvatar name={displayName} size={36} colorScheme="neutral" />
          {(!collapsed || isMobile) && (
            <div className="sider-user-info">
              <div className="sider-user-name">{displayName}</div>
              <div className="sider-user-role">{user?.role || 'Administrator'}</div>
            </div>
          )}
        </div>
      </Sider>

      <Layout
        className="dashboard-main"
        style={{ marginLeft: isMobile ? 0 : siderWidth }}
      >
        <Header className="dashboard-header">
          <div className="header-left">
            <AppButton
              id="btn-toggle-sidebar"
              variant="text"
              icon={
                isMobile
                  ? <MenuUnfoldOutlined />
                  : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
              }
              onClick={() => isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)}
              className="header-toggle-btn"
            />
            <AppBreadcrumb
              className="header-breadcrumb"
              items={[
                { title: 'Akura', href: '/dashboard' },
                { title: currentLabel },
              ]}
            />
          </div>

          <div className="header-right">
            <Tooltip title="Notifications">
              <AppBadge variant="danger" count={3} size="small" className="notif-badge">
                <AppButton
                  id="btn-notifications"
                  variant="text"
                  icon={<BellOutlined />}
                  className="header-icon-btn"
                />
              </AppBadge>
            </Tooltip>

            <div className="header-divider" />

            <AppDropdown menu={{ items: userMenuItems, onClick: handleUserMenu }}>
              <div className="header-user-btn" id="header-user-dropdown" role="button">
                <AppAvatar name={displayName} size={34} colorScheme="primary" />
                <div className="header-user-info">
                  <span className="header-user-name">{displayName}</span>
                  <span className="header-user-role">{user?.role || 'Administrator'}</span>
                </div>
              </div>
            </AppDropdown>
          </div>
        </Header>

        <Content className="dashboard-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default DashboardLayout
