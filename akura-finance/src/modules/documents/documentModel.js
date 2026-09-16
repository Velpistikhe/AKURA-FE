export const dateValue = (value) => value ? String(value).slice(0, 10) : ''
export const money = (value) => value == null ? '-' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)
export const canEdit = (record) => record?.isActive === true && record.status === 'DRAFT'
export function formValues(record = {}) {
  return { number: record.number || '', title: record.title || '', date: dateValue(record.date), dueDate: dateValue(record.dueDate), notes: record.notes || '' }
}
export function documentPayload(values, original, quotation, kind = 'proforma-invoices') {
  const current = { ...(kind === 'invoices' ? {} : { date: dateValue(values.date) }), title: values.title.trim(), dueDate: dateValue(values.dueDate) || null, notes: values.notes?.trim() || null }
  if (!original) return { ...current, status: 'DRAFT', quotationId: quotation.id, quotationVersion: quotation.version }
  const previous = documentPayload(formValues(original), null, { id: original.quotationId, version: original.quotationVersion }, kind)
  const changes = Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== previous[key]))
  return Object.keys(changes).length ? { ...changes, version: original.version } : null
}
