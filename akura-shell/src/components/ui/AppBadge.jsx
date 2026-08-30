import { Badge } from '../global'

/**
 * AppBadge — Wrapper Ant Design Badge
 *
 * @param {'primary'|'danger'|'success'|'warning'} variant
 *   Menentukan warna badge secara semantik.
 */

const COLOR_MAP = {
  primary: '#1a2e5e',
  danger:  '#e02020',
  success: '#52c41a',
  warning: '#faad14',
  info:    '#1890ff',
}

function AppBadge({ variant = 'danger', color, children, ...rest }) {
  const resolvedColor = color || COLOR_MAP[variant] || COLOR_MAP.danger

  return (
    <Badge color={resolvedColor} {...rest}>
      {children}
    </Badge>
  )
}

export default AppBadge
