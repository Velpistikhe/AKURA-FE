import { Divider } from '../global'

/**
 * AppDivider — Wrapper Ant Design Divider
 * Default: horizontal, warna border brand-light.
 */
function AppDivider({ children, className = '', ...rest }) {
  return (
    <Divider
      className={`app-divider ${className}`}
      style={{ borderColor: 'rgba(26, 46, 94, 0.1)', margin: '20px 0' }}
      {...rest}
    >
      {children}
    </Divider>
  )
}

export default AppDivider
