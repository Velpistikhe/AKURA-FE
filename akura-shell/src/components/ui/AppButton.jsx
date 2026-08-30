import { Button } from '../global'
import './AppButton.css'

/**
 * AppButton — Wrapper Ant Design Button
 *
 * Props tambahan:
 * @param {'primary'|'danger'|'outline'|'ghost'|'text'|'link'} variant
 *   - 'primary'  : tombol biru navy utama (default)
 *   - 'danger'   : tombol merah aksen
 *   - 'outline'  : border navy, background transparent
 *   - 'ghost'    : transparan dengan border putih (untuk background gelap)
 *   - 'text'     : tanpa border & background
 *   - 'link'     : gaya hyperlink
 * @param {'sm'|'md'|'lg'|'xl'} size  (alias lebih semantik)
 * Semua props Ant Design Button lainnya tetap diteruskan (type, htmlType, dll.)
 */
function AppButton({
  variant = 'primary',
  size,
  children,
  className = '',
  ...rest
}) {
  // Map variant → Ant Design props
  const variantProps = {
    primary: { variant: 'primary' },
    danger: { variant: 'primary', isDanger: true },
    outline: { variant: 'default' },
    ghost: { variant: 'default', ghost: true },
    text: { variant: 'text' },
    link: { variant: 'link' },
  }

  // Map size alias → Ant Design size
  const sizeMap = { sm: 'small', md: 'middle', lg: 'large', xl: 'large' }
  const antdSize = sizeMap[size] || size

  return (
    <Button
      size={antdSize}
      className={`app-btn app-btn--${variant} ${size === 'xl' ? 'app-btn--xl' : ''} ${className}`}
      {...(variantProps[variant] || variantProps.primary)}
      {...rest}
    >
      {children}
    </Button>
  )
}

export default AppButton
