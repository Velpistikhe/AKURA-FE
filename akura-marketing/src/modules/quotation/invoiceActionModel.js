export const canCreateInvoice = (user, quotation) => user?.section === 'FINANCE'
  && quotation?.isActive === true && quotation.status === 'APPROVED'
  && (quotation.invoiceStatus == null || quotation.invoiceStatus === '')

export function invoicePayload(values, quotation) {
  return {
    title: values.title.trim(),
    dueDate: values.dueDate || null, notes: values.notes?.trim() || null,
    status: 'DRAFT', quotationId: quotation.id, quotationVersion: quotation.version,
  }
}
