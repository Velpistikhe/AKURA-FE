// Marketing only creates a Work Order from an APPROVED quotation through the
// quotation table action; list, detail, editing and starting live in the
// Field Service MFE. Company basis creation has no Marketing UI.
export const canCreateWorkOrders = (user) => Boolean(user?.isActive && user.officeBranchId && user.section === 'MARKETING'
  && ['USER', 'ADMIN'].includes(user.role))

export const canCreateWorkOrderFromQuotation = (user, quotation) => Boolean(canCreateWorkOrders(user)
  && quotation?.id && quotation.isActive && quotation.status === 'APPROVED'
  && !quotation.hasWorkOrder && !quotation.workOrderId)

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

export const MAX_QUANTITY = 999999999999.999
export function normalizeQuantity(value) {
  if (!['string', 'number'].includes(typeof value) || !/^\d{1,12}(\.\d{1,3})?$/.test(String(value))) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= MAX_QUANTITY ? number : null
}

export const WORK_ORDER_REPORT_DATES = [
  ['dailyReport', 'Daily Report'], ['officialReportDelivery', 'Official Report Delivery'],
  ['dailyReportDelivery', 'Daily Report Delivery'], ['poDate', 'PO Date'],
]

export function workOrderHeaderPayload(values) {
  const header = {}
  for (const [key, max] of [['subject', 255], ['poNumber', 100]]) {
    if (values[key] == null || values[key] === '') continue
    if (typeof values[key] !== 'string' || !values[key].trim() || values[key].trim().length > max) throw new Error(`Enter a valid ${key}.`)
    header[key] = values[key].trim()
  }
  if (values.officialReport != null) {
    if (typeof values.officialReport !== 'boolean') throw new Error('Select whether an official report is required.')
    header.officialReport = values.officialReport
  }
  for (const [key, label] of WORK_ORDER_REPORT_DATES) {
    if (values[key] == null || values[key] === '') continue
    if (!validDate(values[key])) throw new Error(`Enter a valid ${label.toLowerCase()} date.`)
    header[key] = values[key]
  }
  return header
}

export function inspectorOptions(users = []) {
  const names = new Map()
  for (const user of users) {
    const name = [user.firstName, user.lastName].filter((part) => typeof part === 'string' && part.trim()).map((part) => part.trim()).join(' ')
    if (name && name.length <= 255 && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), { value: name, label: name })
  }
  return [...names.values()]
}

export function workOrderPayload(values, quotation) {
  if (!validDate(values.startDate)) throw new Error('Start date is required and must be valid.')
  if (!validDate(values.endDate) || values.endDate < values.startDate) throw new Error('End date must be on or after start date.')
  const inspectors = (Array.isArray(values.inspectors) ? values.inspectors : []).map((name) => typeof name === 'string' ? name.trim() : '')
  if (inspectors.length > 100 || inspectors.some((name) => !name || name.length > 255)) throw new Error('Select up to 100 inspector names, each with 1–255 characters.')
  if (new Set(inspectors.map((name) => name.toLowerCase())).size !== inspectors.length) throw new Error('Inspector names must be unique.')
  if (values.basis !== 'quotation') throw new Error('A quotation is the only work order basis available in Marketing.')
  if (!quotation?.id || quotation.id !== values.quotationId || quotation.status !== 'APPROVED'
    || !quotation.isActive) throw new Error('Select an active, approved quotation.')
  if (!validDate(values.endDate) || values.endDate < values.startDate) throw new Error('A valid end date on or after the start date is required for a quotation work order.')
  if (inspectors.length < 1) throw new Error('Select at least one inspector for a quotation work order.')
  const items = Array.isArray(values.items) ? values.items : []
  const itemSizeIds = items.map((item) => typeof item?.itemSizeId === 'string' ? item.itemSizeId.trim() : '')
  if (itemSizeIds.length < 1 || itemSizeIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) throw new Error('Select at least one valid quotation item.')
  if (new Set(itemSizeIds.map((id) => id.toLowerCase())).size !== itemSizeIds.length) throw new Error('Quotation items must be unique.')
  const quotationItemSizeIds = new Set((quotation.items || [])
    .filter((item) => item.isActive !== false && typeof item.itemSizeId === 'string')
    .map((item) => item.itemSizeId.toLowerCase()))
  if (itemSizeIds.some((id) => !quotationItemSizeIds.has(id.toLowerCase()))) throw new Error('Every selected item must belong to this quotation. Reload the quotation detail and try again.')
  return {
    ...workOrderHeaderPayload(values),
    quotationId: quotation.id,
    startDate: values.startDate,
    endDate: values.endDate,
    inspectors,
    items: items.map((item, index) => {
      const quantityInspection = normalizeQuantity(item.quantityInspection)
      const quantityMaintenance = normalizeQuantity(item.quantityMaintenance)
      if (quantityInspection === null || quantityMaintenance === null) throw new Error('Enter valid inspection and maintenance quantities with at most three decimals.')
      return { itemSizeId: itemSizeIds[index], quantityInspection, quantityMaintenance }
    }),
  }
}

export function quotationWorkOrderPayload(values, quotation) {
  return workOrderPayload({ ...values, basis: 'quotation', quotationId: quotation.id }, quotation)
}

// Item labels mirror the quotation form so each line reads consistently.
export const quotationItemLabel = (item) => `${item?.size ?? 'Without size'} - ${item?.itemName ?? 'Item'} / ${item?.serviceName || 'Standalone'}`

// Only active lines of the quotation can back a work order line.
export const activeQuotationItems = (items = []) => items
  .filter((item) => item?.isActive !== false && typeof item?.itemSizeId === 'string' && item.itemSizeId)

export const quotationItemOptions = (items = []) => activeQuotationItems(items)
  .map((item) => ({ value: item.itemSizeId, label: quotationItemLabel(item) }))

// Client-side search for the item tables: the quotation lines are already in
// memory, so filtering and paging never reach the backend. Each table column
// filters on its own field through the column header search.
const matchesTerm = (value, term) => typeof value === 'string' && value.toLowerCase().includes(String(term).trim().toLowerCase())

export const filterQuotationItems = (items = [], filters = {}) => items.filter((item) =>
  (!filters.serviceName || matchesTerm(item?.serviceName, filters.serviceName))
  && (!filters.itemName || matchesTerm(item?.itemName, filters.itemName))
  && (!filters.size || matchesTerm(item?.size, filters.size)))

export const emptyItemFilters = () => ({ serviceName: '', itemName: '', size: '' })

// A work order needs a date range, at least one inspector and at least one
// quotation item before it can be submitted.
export function workOrderFormComplete(values = {}, itemCount = 0) {
  return validDate(values.startDate) && validDate(values.endDate) && values.endDate >= values.startDate
    && Array.isArray(values.inspectors) && values.inspectors.length > 0
    && itemCount > 0
}
