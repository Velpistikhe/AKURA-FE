import { Checkbox } from '../global'

/**
 * AppCheckbox — Wrapper Ant Design Checkbox
 * Styling dikunci via index.css token --primary.
 * Mendukung semua props Ant Design Checkbox.
 */
function AppCheckbox({ children, ...rest }) {
  return <Checkbox {...rest}>{children}</Checkbox>
}

AppCheckbox.Group = Checkbox.Group

export default AppCheckbox
