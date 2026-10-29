export const canCreateInvoice = (user, quotation) => user?.section === 'FINANCE'
  && quotation?.isActive === true && quotation.status === 'APPROVED'

export function invoicePayload(values, quotation) {
  return {
    source: 'QUOTATION', quotation,
    dueDate: values.dueDate, notes: values.notes?.trim() || null,
  }
}
