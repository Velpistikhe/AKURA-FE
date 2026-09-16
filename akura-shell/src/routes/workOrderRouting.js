const clean = (value) => String(value || '').trim().replace(/^\/+|\/+$/g, '')
const hasWorkOrders = (menu) => (menu.items || []).some((item) => ['work-order', 'work-orders'].includes(clean(item.key)))

export function resolveMenuPath(menuKey, itemKey) {
  const menu = clean(menuKey), item = clean(itemKey)
  if (['marketing', 'field-service', 'fieldservice'].includes(menu) && ['work-order', 'work-orders'].includes(item)) return '/field-service/work-orders'
  if (['fieldservice', 'field-service'].includes(menu) && !item) return '/field-service'
  return [menu, item].filter(Boolean).length ? `/${[menu, item].filter(Boolean).join('/')}` : ''
}

export function workOrderMfe(menus, user) {
  const marketing = (menus || []).some((menu) => clean(menu.key) === 'marketing' && hasWorkOrders(menu))
  const fieldService = (menus || []).some((menu) => ['field-service', 'fieldservice'].includes(clean(menu.key)) && hasWorkOrders(menu))
  if (!marketing && !fieldService) return null
  if (user?.section === 'FIELD_SERVICE') return 'fieldservice'
  return marketing ? 'marketing' : 'fieldservice'
}
