import DocumentPage from '../documents/DocumentPage'
export default function ProformaInvoicePage({ currentUser }) {
  return <DocumentPage kind="proforma-invoices" title="Proforma Invoice" currentUser={currentUser} />
}
