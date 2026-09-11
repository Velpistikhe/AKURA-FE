export const STATUSES = ['CREATED', 'SENT', 'REJECTED', 'APPROVED', 'REVISED', 'CONFIRMED', 'ON_PROGRESS', 'WORK_ORDER_COMPLETE', 'COMPLETE']
export const INQUIRY_METHODS = ['EMAIL', 'WHATSAPP', 'VERBAL', 'JOB_ORDER_REQUEST']
export const INVOICE_STATUSES = ['CREATED', 'SEND', 'APPROVED', 'COMPLETE', 'CANCELED', 'EXPIRED']
export const TEXT_FIELDS = [
  ['subject', 'Subject'], ['termOfPayment', 'Term of Payment'], ['validity', 'Validity'],
  ['supplyAkura', 'Akura Supply'], ['supplyCustomer', 'Customer Supply'], ['location', 'Location'],
  ['accomplished', 'Completion Time'], ['deliveryReports', 'Delivery Reports'],
]
export const QUANTITY_PATTERN = /^(?=.*[1-9])\d{1,12}(\.\d{1,3})?$/
export const PRICE_PATTERN = /^\d{1,12}(\.\d{1,2})?$/
export const dateValue = (value) => value ? value.slice(0, 10) : null
export const quotationNumber = (record) => `${record.no}/${record.numberYear}${record.revision ? ` - Revision ${record.revision}` : ''}`
export const displayEnum = (value) => value ? value.replaceAll('_', ' ') : '-'
export const money = (value) => value == null ? '-' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))

export function decimal(value) {
  const [whole, fraction = ''] = String(value ?? '').split('.')
  const trimmed = fraction.replace(/0+$/, '')
  return `${whole.replace(/^0+(?=\d)/, '')}${trimmed ? `.${trimmed}` : ''}`
}

export function quotationPayload(values) {
  return {
    ...Object.fromEntries(TEXT_FIELDS.map(([key]) => [key, (values[key] || '').trim()])),
    date: dateValue(values.date), inquiryDate: dateValue(values.inquiryDate), inquiryMethod: values.inquiryMethod,
    staffId: values.staffId, tax: Number(values.tax), status: values.status, invoiceStatus: values.invoiceStatus || null,
    items: (values.items || []).filter((item) => item.isActive !== false).map((item) => ({
      ...(item.id ? { id: item.id } : {}), itemSizeId: item.itemSizeId,
      quantity: decimal(item.quantity), unitPrice: decimal(item.unitPrice),
    })),
  }
}

export function quotationChanges(values, original) {
  const current = quotationPayload(values)
  const previous = quotationPayload(original)
  return Object.fromEntries(Object.entries(current).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(previous[key])))
}

export function quotationFormValues(record) {
  return record ? {
    ...quotationPayload(record),
    date: dateValue(record.date) || '',
    items: record.items.filter((item) => item.isActive !== false).map((item) => ({
      id: item.id, itemSizeId: item.itemSizeId, quantity: decimal(item.quantity), unitPrice: decimal(item.unitPrice),
      itemName: item.itemName, serviceName: item.serviceName, serviceType: item.serviceType, size: item.size,
      catalogLabel: `${item.size} - ${item.itemName} / ${item.serviceName}`,
    })),
  } : { date: '', inquiryMethod: 'EMAIL', tax: 0, status: 'CREATED', invoiceStatus: null, items: [] }
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

