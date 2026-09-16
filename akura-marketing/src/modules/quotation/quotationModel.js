export const INQUIRY_METHODS = ['EMAIL', 'WHATSAPP', 'VERBAL', 'JOB_ORDER_REQUEST']
export const TEXT_FIELDS = [
  ['subject', 'Subject'], ['termOfPayment', 'Term of Payment'], ['validity', 'Validity'],
  ['supplyAkura', 'Akura Supply'], ['supplyCustomer', 'Customer Supply'], ['location', 'Location'],
  ['accomplished', 'Completion Time'], ['deliveryReports', 'Delivery Reports'],
]
export const QUANTITY_PATTERN = /^\d{1,12}(\.\d{1,3})?$/
export function quotationOptionValues(size) {
  const priceInspection = size.priceInspection ?? size.priceService
  if (size.priceStatus !== 'AVAILABLE' || priceInspection == null || size.catalogActive === false || !['PRIMARY', 'SISTER_COMPANY'].includes(size.priceSource)) return null
  const catalog = size.catalogSnapshot || { itemName: size.item?.name, serviceName: size.item?.service?.name, size: size.size }
  return {
    itemSizeId: size.id, itemName: catalog.itemName, serviceName: catalog.serviceName, size: catalog.size,
    quantityInspection: '1', quantityMaintenance: '0',
    priceInspection, priceMaintenance: size.priceMaintenance,
  }
}
export const dateValue = (value) => value ? value.slice(0, 10) : null
export const quotationNumber = (record) => `${record.no == null || record.numberYear == null ? 'Draft' : `${record.no}/${record.numberYear}`}${record.revision ? ` - Revision ${record.revision}` : ''}`
export const canApproveQuotation = (record) => record?.isActive === true && ['CREATED', 'SENT', 'REVISED'].includes(record.status)
export const displayEnum = (value) => value ? value.replaceAll('_', ' ') : '-'
export const money = (value) => value == null ? '-' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))

export function decimal(value) {
  const [whole, fraction = ''] = String(value ?? '').split('.')
  const trimmed = fraction.replace(/0+$/, '')
  return `${whole.replace(/^0+(?=\d)/, '')}${trimmed ? `.${trimmed}` : ''}`
}

export function quotationPayload(values, { create = false } = {}) {
  return {
    ...Object.fromEntries(TEXT_FIELDS.map(([key]) => [key, (values[key] || '').trim()])),
    inquiryDate: dateValue(values.inquiryDate), inquiryMethod: values.inquiryMethod,
    companyId: values.companyId || values.companySnapshot?.id,
    staffId: values.staffId || null,
    items: (values.items || []).filter((item) => item.isActive !== false).map((item) => ({
      ...(!create && item.id ? { id: item.id } : {}), itemSizeId: item.itemSizeId,
      quantityInspection: decimal(item.quantityInspection),
      quantityMaintenance: decimal(item.quantityMaintenance ?? '0'),
    })),
  }
}

export function quotationChanges(values, original) {
  const current = quotationPayload(values)
  const previous = quotationPayload(quotationFormValues(original))
  const changes = Object.fromEntries(Object.entries(current).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(previous[key])))
  if (current.companyId !== previous.companyId || current.staffId !== previous.staffId) changes.items = current.items
  return changes
}

export function quotationFormValues(record) {
  return record ? {
    ...quotationPayload(record),
    items: record.items.filter((item) => item.isActive !== false).map((item) => ({
      id: item.id, itemSizeId: item.itemSizeId,
      quantityInspection: decimal(item.quantityInspection), quantityMaintenance: decimal(item.quantityMaintenance ?? '0'),
      priceInspection: item.priceInspection, priceMaintenance: item.priceMaintenance,
      itemName: item.itemName, serviceName: item.serviceName, serviceType: item.serviceType, size: item.size,
      catalogLabel: `${item.size} - ${item.itemName} / ${item.serviceName}`,
    })),
  } : { inquiryMethod: 'EMAIL', items: [] }
}

export async function loadAll(list, key, params = {}) {
  const rows = []
  let page = 1
  while (true) {
    const response = await list({ ...params, page, limit: 100 })
    const batch = response.data?.[key] || []
    rows.push(...batch)
    if (page >= (response.data?.pagination?.totalPages || 1)) return rows
    page++
  }
}

