// Ant Design adapter boundary. Semua wrapper dan modul aplikasi mengambil
// dependency UI dari file ini agar upgrade Ant Design tetap terisolasi.
export * from './AntdComponents'
export { message, notification } from 'antd'

export { default as idID } from 'antd/locale/id_ID'

export {
  ApiOutlined,
  AppstoreOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloudOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  EyeOutlined,
  FileTextOutlined,
  FolderOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LockOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MinusCircleOutlined,
  ProfileOutlined,
  QuestionCircleOutlined,
  RiseOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
