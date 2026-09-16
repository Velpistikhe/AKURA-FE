export function resolveFieldServiceRoute(pathname) {
  const path = pathname.replace(/\/+$/, '')
  if (path === '/field-service') return 'overview'
  if (/^\/field-service\/work-orders?$/.test(path)) return 'work-orders'
  return null
}
