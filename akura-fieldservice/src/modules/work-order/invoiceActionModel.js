export const FINANCE_DOCUMENT_KINDS = [
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'PROFORMA_INVOICE', label: 'Proforma Invoice' },
]

export const canCreateFinanceDocument = (user, workOrder) => Boolean(user?.isActive && user.officeBranchId
  && user.section === 'MARKETING' && workOrder?.quotationId && workOrder.status === 'COMPLETED'
  && !workOrder.revoked && (!workOrder.officeBranchId || workOrder.officeBranchId === user.officeBranchId))

export function financeDocumentDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function validateFinanceDocumentDate(value, documentDate = financeDocumentDate()) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Due date is required.'
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return 'Enter a valid due date.'
  if (value < documentDate) return 'Due date cannot precede the document date.'
  return null
}

export function validatePurchaseOrderDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a valid purchase order date.'
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? 'Enter a valid purchase order date.' : null
}

export function financeDocumentPayload(quotationId, values) {
  const dateError = validateFinanceDocumentDate(values.dueDate)
  if (dateError) throw new Error(dateError)
  const location = values.location?.trim()
  if (!location || location.length > 255) throw new Error('Location is required and must not exceed 255 characters.')
  if (!FINANCE_DOCUMENT_KINDS.some(({ value }) => value === values.kind)) throw new Error('Select a valid document type.')
  const purchaseOrderNumber = values.purchaseOrderNumber?.trim()
  if (!purchaseOrderNumber || purchaseOrderNumber.length > 100) throw new Error('Purchase order number is required and must not exceed 100 characters.')
  const purchaseOrderDateError = validatePurchaseOrderDate(values.purchaseOrderDate)
  if (purchaseOrderDateError) throw new Error(purchaseOrderDateError)
  return {
    purchaseOrderNumber,
    purchaseOrderDate: values.purchaseOrderDate,
    quotationId,
    kind: values.kind,
    dueDate: values.dueDate,
    location,
  }
}

