import DocumentPage from '../documents/DocumentPage'
export default function InvoicePage({ currentUser }) {
  return <DocumentPage kind="invoices" title="Invoice" currentUser={currentUser} />
}
