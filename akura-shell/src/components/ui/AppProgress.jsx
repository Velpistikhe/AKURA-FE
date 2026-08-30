import { Progress } from '../global'

/**
 * AppProgress — Wrapper Ant Design Progress
 *
 * @param {'primary'|'danger'|'success'|'warning'|string} colorScheme
 *   Preset warna sesuai brand, atau hex/color langsung.
 * @param {number} percent  — 0–100
 * @param {'line'|'circle'|'dashboard'} type
 */

const COLOR_MAP = {
  primary: '#1a2e5e',
  danger:  '#e02020',
  success: '#52c41a',
  warning: '#faad14',
  info:    '#1890ff',
}

function AppProgress({
  colorScheme = 'primary',
  strokeColor,
  trackColor = 'rgba(26, 46, 94, 0.07)',
  strokeLinecap = 'round',
  type = 'line',
  ...rest
}) {
  const resolvedColor = strokeColor || COLOR_MAP[colorScheme] || colorScheme

  return (
    <Progress
      type={type}
      strokeColor={resolvedColor}
      trackColor={trackColor}
      strokeLinecap={strokeLinecap}
      {...rest}
    />
  )
}

export default AppProgress
