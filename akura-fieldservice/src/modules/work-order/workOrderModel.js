export const WORK_ORDER_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']
export const canAccessWorkOrders = (user) => Boolean(user?.isActive && user.officeBranchId
  && (['ADMIN', 'APP_MANAGER'].includes(user.role) || ['MARKETING', 'FIELD_SERVICE'].includes(user.section)))

export const canEditWorkOrders = (user) => Boolean(canAccessWorkOrders(user)
  && ['MARKETING', 'FIELD_SERVICE'].includes(user.section))

// Starting a work order (DRAFT -> IN_PROGRESS) is a Marketing section write the
// backend re-validates against Auth and Marketing snapshots; only Marketing
// admins own that transition in the UI. ADMIN/APP_MANAGER roles never bypass
// the backend's write section restriction.
export const canStartWorkOrders = (user) => Boolean(user?.isActive && user.officeBranchId
  && user.role === 'ADMIN' && user.section === 'MARKETING')

export const canStartWorkOrder = (user, workOrder) => Boolean(canStartWorkOrders(user)
  && workOrder?.id && workOrder.status === 'DRAFT' && !workOrder.revoked
  && Number.isInteger(workOrder.version))

export const canRevokeWorkOrder = (user, workOrder) => Boolean(user?.isActive && user.officeBranchId
  && user.role === 'ADMIN' && user.section === 'MARKETING'
  && workOrder?.id && workOrder.status === 'DRAFT' && !workOrder.revoked
  && Number.isInteger(workOrder.version) && workOrder.version >= 0 && workOrder.version < 2147483647)

export const workOrderFormValues = (record) => ({
  startDate: record.startDate?.slice(0, 10) || '',
  endDate: record.endDate?.slice(0, 10) || '',
  status: record.status,
  summary: record.summary,
  inspectors: (record.inspectors || []).map((inspector) => inspector.name),
})

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '')
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

export function workOrderUpdatePayload(values, record) {
  if (record.revoked) throw new Error('Revoked work orders cannot be edited.')
  if (!Number.isInteger(record.version) || record.version < 0 || record.version > 2147483646) throw new Error('Reload the work order before saving.')
  if (!validDate(values.startDate)) throw new Error('Enter a valid start date.')
  if (values.endDate && (!validDate(values.endDate) || values.endDate < values.startDate)) throw new Error('End date must be on or after start date.')
  if (!WORK_ORDER_STATUSES.includes(values.status)) throw new Error('Select a valid status.')
  const summary = values.summary?.trim()
  if (!summary || summary.length > 20000) throw new Error('Enter a summary of up to 20,000 characters.')
  const inspectors = (values.inspectors || []).map((name) => name.trim())
  if (inspectors.length > 100 || inspectors.some((name) => !name || name.length > 255)) throw new Error('Enter up to 100 inspector names, each with 1–255 characters.')
  if (new Set(inspectors.map((name) => name.toLowerCase())).size !== inspectors.length) throw new Error('Inspector names must be unique.')
  const next = { startDate: values.startDate, endDate: values.endDate || null, status: values.status, summary, inspectors }
  const previous = { ...workOrderFormValues(record), endDate: record.endDate?.slice(0, 10) || null }
  const changes = Object.fromEntries(Object.entries(next).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(previous[key])))
  return Object.keys(changes).length ? { ...changes, version: record.version } : null
}

export function formatHistoryValue(value) {
  if (value == null || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.map(formatHistoryValue).join(', ') : '-'
  if (typeof value === 'object') return value.name || value.number || value.no || JSON.stringify(value)
  return String(value)
}

// Snapshot presentation helpers: the detail modal renders the quotation snapshot
// stored on the work order and never recalculates document totals.
export const money = (value) => value == null ? '-'
  : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))

export const quotationNumber = (snapshot) => snapshot?.no == null || snapshot?.numberYear == null
  ? snapshot?.no || 'Draft'
  : `${snapshot.no}/${snapshot.numberYear}`

// Only active snapshot lines are part of the document the work order was built from.
export const activeQuotationItems = (snapshot) => (snapshot?.items || []).filter((item) => item.isActive !== false)
