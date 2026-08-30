import { Breadcrumb } from '../global'

/**
 * AppBreadcrumb — Wrapper Ant Design Breadcrumb
 * Menerima prop `items` sama persis seperti Ant Design v5+.
 * Memungkinkan penyesuaian style terpusat.
 */
function AppBreadcrumb({ items = [], className = '', ...rest }) {
  return (
    <Breadcrumb
      className={`app-breadcrumb ${className}`}
      items={items}
      {...rest}
    />
  )
}

export default AppBreadcrumb
