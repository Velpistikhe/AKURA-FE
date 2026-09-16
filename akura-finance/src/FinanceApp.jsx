import { App, Card, Result, Tag, Typography } from 'antd'
import { Button } from './components/FinanceControls'
import { ArrowRightOutlined } from '@ant-design/icons'
import QuotationPage from './modules/quotation/QuotationPage'
import ProformaInvoicePage from './modules/proforma-invoice/ProformaInvoicePage'
import InvoicePage from './modules/invoice/InvoicePage'
import TaxPage from './modules/tax/TaxPage'
import { financeModules, resolveFinanceRoute } from './routes/financeRoutes'
import './FinanceApp.css'
import './components/ModalMotion.css'

const pages = { finance_quotations: QuotationPage, proforma_invoices: ProformaInvoicePage, invoices: InvoicePage, taxes: TaxPage }
export default function FinanceApp({ currentUser, pathname = window.location.pathname, navigate = (path) => window.location.assign(path) }) {
  const route = resolveFinanceRoute(pathname)
  const Page = pages[route]
  return <App><main className="finance-workspace">
    {Page ? <Page currentUser={currentUser} /> : route === 'overview' ? <>
      <Card className="finance-overview-card"><span className="finance-eyebrow">Finance workspace</span>
        <Typography.Title level={2}>Akura Finance</Typography.Title>
        <Typography.Text type="secondary">Review quotations and manage financial documents.</Typography.Text>
        <div className="finance-overview-decoration" aria-hidden="true" /></Card>
      <div className="finance-modules">{financeModules.map((module) => <Card key={module.key}>
        <Tag>{module.key === 'finance_quotations' ? 'View only' : module.key === 'taxes' ? 'Branch tax periods' : 'Drafts and final documents'}</Tag>
        <Typography.Title level={3}>{module.label}</Typography.Title><Typography.Paragraph type="secondary">{module.description}</Typography.Paragraph>
        <Button icon={<ArrowRightOutlined />} onClick={() => navigate(module.path)}>Open {module.label}</Button>
      </Card>)}</div>
    </> : <Result status="404" title="Module not found" subTitle="This Finance page is not available." extra={<Button onClick={() => navigate('/finance')}>Back to Finance</Button>} />}
  </main></App>
}
