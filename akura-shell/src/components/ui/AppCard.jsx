import { Card } from '../global'
import './AppCard.css'

/**
 * AppCard — Wrapper Ant Design Card
 *
 * @param {'default'|'glass'|'outlined'|'flat'} variant
 *   - 'default'  : shadow ringan, border tipis (default)
 *   - 'glass'    : glassmorphism, cocok di background gelap
 *   - 'outlined' : hanya border, tanpa shadow
 *   - 'flat'     : tanpa shadow & border, background solid
 * @param {boolean} hoverable  — aktifkan efek hover lift
 */
function AppCard({
  variant = 'default',
  hoverable = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <Card
      variant={variant === 'outlined' ? 'outlined' : 'borderless'}
      className={`app-card app-card--${variant} ${hoverable ? 'app-card--hover' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Card>
  )
}

export default AppCard
