const workspaceDetails = {
  app_manager: { title: 'App Manager', description: 'People, branches, and application access.', icon: 'team' },
  marketing: { title: 'Marketing', description: 'Prepare quotations and coordinate customer work.', icon: 'document' },
  'field-service': { title: 'Field Service', description: 'Plan inspection work and manage work orders.', icon: 'inspection' },
  finance: { title: 'Finance', description: 'Review commercial documents and branch tax periods.', icon: 'finance' },
  referensi: { title: 'Reference', description: 'Customer records, services, and inspection catalogs.', icon: 'catalog' },
}

const normalizeKey = (value) => String(value || '').trim().replace(/^\/+|\/+$/g, '')

// Presentation only: links come from the session's menu response, never a role-based guess.
export function buildWorkspaceGroups(menus) {
  if (!Array.isArray(menus)) return []
  const paths = new Set()
  return [...menus].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).flatMap((menu) => {
    const key = normalizeKey(menu.key)
    const details = Object.prototype.hasOwnProperty.call(workspaceDetails, key) ? workspaceDetails[key] : null
    if (!details) return []
    const entries = menu.hasItem ? (Array.isArray(menu.items) ? menu.items : []) : [menu]
    const links = [...entries].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).flatMap((item) => {
      const itemKey = normalizeKey(item.key)
      if (!itemKey || !item.label) return []
      const path = menu.hasItem ? `/${key}/${itemKey}` : `/${key}`
      if (paths.has(path)) return []
      paths.add(path)
      return [{ path, label: item.label }]
    })
    return links.length ? [{ key, ...details, links }] : []
  })
}

export function branchLabel(user) {
  if (!user?.officeBranchId) return 'No branch assigned'
  return user.officeBranch?.name || user.officeBranchName || 'Branch assigned'
}
