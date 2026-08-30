import { Dropdown } from '../global'

/**
 * AppDropdown — Wrapper Ant Design Dropdown
 *
 * Default: placement bottomRight, trigger click.
 * Props diteruskan semua ke Ant Design Dropdown.
 */
function AppDropdown({
  placement = 'bottomRight',
  trigger = ['click'],
  children,
  ...rest
}) {
  return (
    <Dropdown placement={placement} trigger={trigger} {...rest}>
      {children}
    </Dropdown>
  )
}

export default AppDropdown
