export const financeModules = [
  { key: 'taxes', path: '/referensi/taxes', label: 'Tax', description: 'Manage branch tax periods and synchronization.' },
  { key: 'finance_quotations', path: '/finance/finance_quotations', label: 'Quotations', description: 'View quotation details, customer information, items and totals.' },
  { key: 'proforma_invoices', path: '/finance/proforma_invoices', label: 'Proforma Invoice', description: 'Workspace for proforma invoices.' },
  { key: 'invoices', path: '/finance/invoices', label: 'Invoice', description: 'Workspace for invoices.' },
]

const aliases = {
  taxes: 'taxes', tax: 'taxes',
  finance_quotations: 'finance_quotations', quotations: 'finance_quotations', quotation: 'finance_quotations',
  proforma_invoices: 'proforma_invoices', 'proforma-invoices': 'proforma_invoices', 'proforma-invoice': 'proforma_invoices',
  'performa-invoice': 'proforma_invoices', performa_invoice: 'proforma_invoices', proforma_invoice: 'proforma_invoices',
  invoices: 'invoices', invoice: 'invoices',
}

export function resolveFinanceRoute(pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  if (parts[0] === 'referensi' && parts.length === 2 && parts[1] === 'taxes') return 'taxes'
  if (parts[0] !== 'finance') return 'not-found'
  if (parts.length === 1) return 'overview'
  return parts.length === 2 ? aliases[parts[1]] || 'not-found' : 'not-found'
}
