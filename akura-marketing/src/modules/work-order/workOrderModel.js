// Marketing only creates a Work Order from an APPROVED quotation through the
// quotation table action; list, detail, editing and starting live in the
// Field Service MFE. Company basis creation has no Marketing UI.
export const canCreateWorkOrders = (user) => Boolean(user?.isActive && user.officeBranchId && user.section === 'MARKETING')

export const canCreateWorkOrderFromQuotation = (user, quotation) => Boolean(canCreateWorkOrders(user)
  && quotation?.id && quotation.isActive && quotation.status === 'APPROVED'
  && !quotation.hasWorkOrder && !quotation.workOrderId)

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

export function workOrderPayload(values, quotation, inspectorOptions = []) {
  if (!validDate(values.startDate)) throw new Error('Start date is required and must be valid.')
  if (!validDate(values.endDate) || values.endDate < values.startDate) throw new Error('End date must be on or after start date.')
  const inspectorIds = (values.inspectors || []).map((id) => typeof id === 'string' ? id.trim() : '')
  if (inspectorIds.length > 100 || inspectorIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) throw new Error('Select up to 100 valid inspectors.')
  if (new Set(inspectorIds.map((id) => id.toLowerCase())).size !== inspectorIds.length) throw new Error('Inspectors must be unique.')
  const inspectorById = new Map(inspectorOptions.map((inspector) => [inspector.id?.toLowerCase(), inspector]))
  const inspectors = inspectorIds.map((userId) => {
    const snapshot = inspectorById.get(userId.toLowerCase())
    const name = snapshot?.name
    if (typeof name !== 'string' || !name.trim() || name.length > 255) throw new Error('An inspector option is no longer available. Reload the inspector list and try again.')
    return { userId, name }
  })
  if (values.basis !== 'quotation') throw new Error('A quotation is the only work order basis available in Marketing.')
  if (!quotation?.id || quotation.id !== values.quotationId || quotation.status !== 'APPROVED'
    || !quotation.isActive) throw new Error('Select an active, approved quotation.')
  if (!validDate(values.endDate) || values.endDate < values.startDate) throw new Error('A valid end date on or after the start date is required for a quotation work order.')
  if (inspectors.length < 1) throw new Error('Select at least one inspector for a quotation work order.')
  // CreateWorkOrderFromQuotationRequest requires an items selection of itemSizeId
  // pairs owned by this quotation; quantities are copied server-side from the
  // quotation lines and any extra field is rejected (additionalProperties false).
  const itemSizeIds = (values.items || []).map((id) => typeof id === 'string' ? id.trim() : '')
  if (itemSizeIds.length < 1 || itemSizeIds.length > 100 || itemSizeIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) throw new Error('Select at least one and up to 100 valid quotation items.')
  if (new Set(itemSizeIds.map((id) => id.toLowerCase())).size !== itemSizeIds.length) throw new Error('Quotation items must be unique.')
  const quotationItemSizeIds = new Set((quotation.items || [])
    .filter((item) => item.isActive !== false && typeof item.itemSizeId === 'string')
    .map((item) => item.itemSizeId.toLowerCase()))
  if (itemSizeIds.some((id) => !quotationItemSizeIds.has(id.toLowerCase()))) throw new Error('Every selected item must belong to this quotation. Reload the quotation detail and try again.')
  return {
    quotationId: quotation.id,
    startDate: values.startDate,
    endDate: values.endDate,
    inspectors,
    items: itemSizeIds.map((itemSizeId) => ({ itemSizeId })),
  }
}

export function quotationWorkOrderPayload(values, quotation, inspectorOptions) {
  return workOrderPayload({ ...values, basis: 'quotation', quotationId: quotation.id }, quotation, inspectorOptions)
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
    && itemCount > 0 && itemCount <= 100
}
