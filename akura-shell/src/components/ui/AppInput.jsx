import { Input } from '../global'

/**
 * AppInput — Wrapper Ant Design Input
 *
 * @param {'text'|'password'|'textarea'} inputType
 * @param {ReactNode} prefixIcon  — ikon di sebelah kiri
 * Semua props Ant Design Input diteruskan.
 */
function AppInput({ inputType = 'text', prefixIcon, prefix, ...rest }) {
  const resolvedPrefix = prefixIcon ? (
    <span style={{ color: '#8a9ab8', marginRight: 2 }}>{prefixIcon}</span>
  ) : prefix

  if (inputType === 'password') {
    return (
      <Input.Password
        prefix={resolvedPrefix}
        className="app-input"
        {...rest}
      />
    )
  }

  if (inputType === 'textarea') {
    return <Input.TextArea className="app-input" {...rest} />
  }

  return <Input prefix={resolvedPrefix} className="app-input" {...rest} />
}

export default AppInput
