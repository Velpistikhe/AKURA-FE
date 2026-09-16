export const WORK_ORDER_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']
export const canAccessWorkOrders = (user) => Boolean(user?.isActive && user.officeBranchId
  && (['ADMIN', 'APP_MANAGER'].includes(user.role) || user.section === 'FIELD_SERVICE'))

export function workOrderPayload(values, quotation) {
  const summary = values.summary?.trim()
  if (!summary || summary.length > 20000) throw new Error('Enter a summary of up to 20,000 characters.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.startDate || '')) throw new Error('Start date is required.')
  if (values.endDate && values.endDate < values.startDate) throw new Error('End date must be on or after start date.')
  if (!WORK_ORDER_STATUSES.includes(values.status)) throw new Error('Select a valid status.')
  const inspectors = (values.inspectors || []).map((name) => name.trim())
  if (inspectors.length > 100 || inspectors.some((name) => !name || name.length > 255)) throw new Error('Enter up to 100 inspector names, each with 1–255 characters.')
  if (new Set(inspectors.map((name) => name.toLowerCase())).size !== inspectors.length) throw new Error('Inspector names must be unique.')
  let basis
  if (values.basis === 'quotation') {
    if (!quotation?.id || quotation.id !== values.quotationId || quotation.status !== 'APPROVED'
      || !quotation.isActive || !Number.isInteger(quotation.version)) throw new Error('Select an active, approved quotation.')
    if (quotation.items?.some((item) => item.priceSelection?.priceSource === 'CONTRACT')) throw new Error('This quotation uses contract prices. Select Company Contract as the basis instead.')
    basis = { quotationId: quotation.id, quotationVersion: quotation.version }
  } else if (values.basis === 'company' && values.companyId) basis = { companyId: values.companyId }
  else throw new Error('Select a quotation or company contract as the basis.')
  return { ...basis, startDate: values.startDate, endDate: values.endDate || null, status: values.status, summary, inspectors }
}
