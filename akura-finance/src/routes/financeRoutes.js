export const financeModules = [
  { key: 'taxes', path: '/referensi/taxes', label: 'Tax', description: 'Manage branch tax periods and synchronization.' },
  { key: 'finance_quotations', path: '/finance/finance_quotations', label: 'Quotations', description: 'View quotation details, customer information, items and totals.' },
]

const aliases = {
  taxes: 'taxes', tax: 'taxes',
  finance_quotations: 'finance_quotations', quotations: 'finance_quotations', quotation: 'finance_quotations',
}

export function resolveFinanceRoute(pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  if (parts[0] === 'referensi' && parts.length === 2 && parts[1] === 'taxes') return 'taxes'
  if (parts[0] !== 'finance') return 'not-found'
  if (parts.length === 1) return 'overview'
  return parts.length === 2 ? aliases[parts[1]] || 'not-found' : 'not-found'
}
