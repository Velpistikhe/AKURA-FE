export const dateValue = (value) => value ? String(value).slice(0, 10) : ''
export const money = (value) => value == null ? '-' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)
export const canEdit = (record) => record?.isActive === true && record.status === 'DRAFT'
export const canFinalize = (record) => record?.isActive === true && record.status === 'ON_PROGRESS'
export const documentDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export function documentOptionValues(row) {
  const priceInspection = row.priceInspection ?? row.priceService
  if (!row.id || row.priceStatus !== 'AVAILABLE' || row.catalogActive === false || priceInspection == null || !['PRIMARY', 'SISTER_COMPANY', 'CONTRACT'].includes(row.priceSource)) return null
  const catalog = row.catalogSnapshot || { serviceName: row.item?.service?.name, itemName: row.item?.name, size: row.size }
  return { serviceName: catalog.serviceName, itemName: catalog.itemName, size: catalog.size, priceInspection, priceMaintenance: row.priceMaintenance }
}
export function formValues(record = {}) {
  return { title: record.title || '', dueDate: dateValue(record.dueDate), notes: record.notes || '', items: [] }
}
export function validateDueDate(value, minimum = documentDate(), required = true) {
  if (!value) return required ? 'Due date is required.' : null
  const parsed = new Date(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return 'Enter a valid due date.'
  return value < minimum ? 'Due date cannot precede document date.' : null
}
export const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function documentPayload(values, original) {
  const quotationSource = original?.source === 'QUOTATION' || Boolean(original?.quotationId)
  const dateError = validateDueDate(values.dueDate, original ? dateValue(original.date) : documentDate(), quotationSource)
  if (dateError) throw new Error(dateError)
  if ((values.notes?.trim().length || 0) > 20000) throw new Error('Notes must not exceed 20000 characters.')
  const common = { dueDate: dateValue(values.dueDate) || null, notes: values.notes?.trim() || null }
  if (!original) {
    const companyId = values.companyId?.trim()
    const title = values.title?.trim()
    const purchaseOrderNumber = values.purchaseOrderNumber?.trim()
    if (!uuidPattern.test(companyId || '')) throw new Error('Enter a valid company ID.')
    if (!title || title.length > 255) throw new Error('Title is required and must not exceed 255 characters.')
    if (!purchaseOrderNumber || purchaseOrderNumber.length > 100) throw new Error('Purchase order number is required and must not exceed 100 characters.')
    if (!isValidDate(values.purchaseOrderDate)) throw new Error('Enter a valid purchase order date.')
    const items = (values.items || []).map(item => typeof item === 'string' ? item.trim().toLowerCase() : '')
    if (!items.length || items.length > 100 || items.some(item => !uuidPattern.test(item)) || new Set(items).size !== items.length) throw new Error('Enter 1-100 unique item size IDs.')
    const location = values.location?.trim() || null
    if (location && location.length > 255) throw new Error('Location must not exceed 255 characters.')
    return { companyId, title, purchaseOrderNumber, purchaseOrderDate: values.purchaseOrderDate, location, items, ...common }
  }
  const current = { title: values.title.trim(), ...common }
  const previous = { title: original.title, dueDate: dateValue(original.dueDate) || null, notes: original.notes || null }
  const changes = Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== previous[key]))
  return Object.keys(changes).length ? { ...changes, version: original.version } : null
}
