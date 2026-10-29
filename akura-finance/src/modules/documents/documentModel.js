export const dateValue = (value) => value ? String(value).slice(0, 10) : ''
export const money = (value) => value == null ? '-' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)
export const canEdit = (record) => record?.isActive === true && record.status === 'DRAFT'
export const canFinalize = (record) => record?.isActive === true && record.status === 'ON_PROGRESS'
export const documentDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export function formValues(record = {}) {
  return { source: record.source || 'QUOTATION', title: record.title || '', dueDate: dateValue(record.dueDate), notes: record.notes || '', items: [{}] }
}
export function validateDueDate(value, minimum = documentDate(), required = true) {
  if (!value) return required ? 'Due date is required.' : null
  const parsed = new Date(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return 'Enter a valid due date.'
  return value < minimum ? 'Due date cannot precede document date.' : null
}
export function documentPayload(values, original, quotation, prices) {
  const source = original?.source || (original?.quotationId ? 'QUOTATION' : values.source) || 'QUOTATION'
  const dateError = validateDueDate(values.dueDate, original ? dateValue(original.date) : documentDate(), source === 'QUOTATION')
  if (dateError) throw new Error(dateError)
  const common = { dueDate: dateValue(values.dueDate) || null, notes: values.notes?.trim() || null }
  if (!original && source === 'QUOTATION') {
    if (!quotation?.isActive || quotation.status !== 'APPROVED') throw new Error('Select an active approved quotation.')
    return { source, quotation, ...common }
  }
  if (!original) {
    const items = values.items || []
    if (!items.length || items.length > 100 || new Set(items.map(item => item.itemSizeId)).size !== items.length) throw new Error('Select 1-100 unique item sizes.')
    if (prices?.company?.id !== values.companyId?.trim()) throw new Error('Company prices are unavailable.')
    return { source, companyId: values.companyId.trim(), title: values.title.trim(), ...common, items: items.map(item => {
      const price = prices.items.find(price => price.itemSizeId === item.itemSizeId)
      if (!price || price.priceInspection == null) throw new Error('Item prices are unavailable.')
      const inspection = String(item.quantityInspection ?? '1')
      const maintenance = String(item.quantityMaintenance ?? '0')
      if (![inspection, maintenance].every(value => /^\d{1,12}(\.\d{1,3})?$/.test(value)) || !(Number(inspection) > 0 || Number(maintenance) > 0)) throw new Error('Enter a positive inspection or maintenance quantity.')
      if (price.priceMaintenance == null && Number(maintenance) > 0) throw new Error('Maintenance is unavailable for this item.')
      return { itemSizeId: item.itemSizeId, quantityInspection: inspection, quantityMaintenance: maintenance, priceInspection: price.priceInspection, priceMaintenance: price.priceMaintenance ?? null, note: item.note?.trim() || null }
    }) }
  }
  const current = { title: values.title.trim(), ...common }
  const previous = { title: original.title, dueDate: dateValue(original.dueDate) || null, notes: original.notes || null }
  const changes = Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== previous[key]))
  return Object.keys(changes).length ? { ...changes, version: original.version } : null
}
