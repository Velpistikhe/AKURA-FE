export const WORK_ORDER_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']
export const canAccessWorkOrders = (user) => Boolean(user?.isActive && user.officeBranchId
  && (['ADMIN', 'APP_MANAGER'].includes(user.role) || ['MARKETING', 'FIELD_SERVICE'].includes(user.section)))

export const canEditWorkOrders = (user) => Boolean(canAccessWorkOrders(user)
  && ['MARKETING', 'FIELD_SERVICE'].includes(user.section))

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
