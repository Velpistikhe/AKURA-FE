// Marketing only creates a Work Order from an APPROVED quotation through the
// quotation table action; list, detail, editing and starting live in the
// Field Service MFE. Contract/company basis creation has no Marketing UI.
export const canCreateWorkOrders = (user) => Boolean(user?.isActive && user.officeBranchId && user.section === 'MARKETING')

export const canCreateWorkOrderFromQuotation = (user, quotation) => Boolean(canCreateWorkOrders(user)
  && quotation?.id && quotation.isActive && quotation.status === 'APPROVED'
  && !quotation.items?.some((item) => item.priceSelection?.priceSource === 'CONTRACT'))

export function workOrderPayload(values, quotation, inspectorOptions = []) {
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
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
  if (quotation.items?.some((item) => item.priceSelection?.priceSource === 'CONTRACT')) throw new Error('This quotation uses contract prices and cannot back a work order.')
  if (!validDate(values.endDate) || values.endDate < values.startDate) throw new Error('A valid end date on or after the start date is required for a quotation work order.')
  if (inspectors.length < 1) throw new Error('Select at least one inspector for a quotation work order.')
  return { quotationId: quotation.id, startDate: values.startDate, endDate: values.endDate, inspectors }
}

export function quotationWorkOrderPayload(values, quotation, inspectorOptions) {
  return workOrderPayload({ ...values, basis: 'quotation', quotationId: quotation.id }, quotation, inspectorOptions)
}
