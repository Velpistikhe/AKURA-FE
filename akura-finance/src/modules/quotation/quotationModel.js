const TERMS = [
  ['subject', 'Subject'], ['termOfPayment', 'Term of Payment'], ['validity', 'Validity'],
  ['supplyAkura', 'Akura Supply'], ['supplyCustomer', 'Customer Supply'], ['location', 'Location'],
  ['jobStart', 'Job Start'], ['accomplished', 'Completion Time'], ['deliveryReports', 'Delivery Reports'],
  ['deliveryInvoice', 'Delivery Invoice'],
]

export const quotationTerms = (record) => TERMS.map(([key, title]) => [title, record[key] || '-'])
