import { Link } from 'react-router-dom'
import './AkuraLogo.css'

function AkuraLogo({
  className = '',
  inverse = false,
  showWordmark = true,
  size = 53,
}) {
  const source = showWordmark
    ? (inverse ? '/akura-brand/logo-footer.png' : '/akura-brand/logo.png')
    : '/favicon.png'

  return (
    <Link
      to="/"
      className={`akura-logo ${showWordmark ? '' : 'akura-logo-mark-only'} ${className}`.trim()}
      style={{ '--akura-logo-height': `${size}px` }}
      aria-label="Akura Bina Citra"
    >
      <img src={source} alt="" aria-hidden="true" />
    </Link>
  )
}

export default AkuraLogo
