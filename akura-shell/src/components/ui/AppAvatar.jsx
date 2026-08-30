import { Avatar, UserOutlined } from '../global'

/**
 * AppAvatar — Wrapper Ant Design Avatar
 *
 * @param {'primary'|'danger'|'success'|'neutral'} colorScheme
 *   Menentukan gradient background avatar jika tidak ada `src`.
 * @param {string} name  — jika ada, tampilkan huruf pertama sebagai inisial
 */

const SCHEME_MAP = {
  primary: 'linear-gradient(135deg, #1a2e5e, #2a4080)',
  danger:  'linear-gradient(135deg, #e02020, #ff4444)',
  success: 'linear-gradient(135deg, #389e0d, #52c41a)',
  neutral: 'linear-gradient(135deg, #5a6a8a, #8a9ab8)',
}

function AppAvatar({
  colorScheme = 'primary',
  name,
  src,
  size = 36,
  icon,
  style = {},
  ...rest
}) {
  const bg = SCHEME_MAP[colorScheme] || SCHEME_MAP.primary
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : null

  return (
    <Avatar
      src={src}
      size={size}
      icon={!src && !name ? (icon || <UserOutlined />) : undefined}
      style={{
        background: !src ? bg : undefined,
        border: '2px solid rgba(255,255,255,0.15)',
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    >
      {!src && initials}
    </Avatar>
  )
}

export default AppAvatar
