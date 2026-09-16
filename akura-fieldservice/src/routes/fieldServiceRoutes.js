export function resolveFieldServiceRoute(pathname) {
  const path = pathname.replace(/\/+$/, '')
  if (path === '/field-service') return 'overview'
  if (path === '/field-service/work-orders') return 'work-orders'
  return null
}
