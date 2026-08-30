import './AkuraLogo.css'

function AkuraLogo({
  className = '',
  inverse = false,
  showWordmark = true,
  size = 48,
}) {
  return (
    <div
      className={`akura-logo ${inverse ? 'akura-logo-inverse' : ''} ${className}`.trim()}
      style={{ '--akura-mark-size': `${size}px` }}
      role="img"
      aria-label="Akura Bina Citra"
    >
      <svg
        className="akura-logo-mark"
        viewBox="0 0 68 56"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="akura-mark-upper"
          d="M11 29C14.5 13.8 27.2 5.4 40.6 7.2C54 9 61.3 19.7 60.5 32.8"
        />
        <path
          className="akura-mark-lower"
          d="M8.7 28.8C10 43.5 22.2 51.2 35.2 50.2C46.9 49.2 55.6 41.9 59.8 33.1"
        />
        <circle className="akura-mark-sclera" cx="36" cy="29" r="20" />
        <circle className="akura-mark-iris" cx="36" cy="29" r="13.2" />
        <circle className="akura-mark-pupil" cx="36" cy="29" r="7.2" />
        <circle className="akura-mark-glint" cx="31.7" cy="24.5" r="2.7" />
      </svg>

      {showWordmark && (
        <span className="akura-wordmark">
          <strong>AKURA</strong>
          <span>BINA CITRA</span>
        </span>
      )}
    </div>
  )
}

export default AkuraLogo
