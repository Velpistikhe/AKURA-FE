import { useEffect, useRef, useState } from 'react'
import { Alert, Card, Space, Tag, Typography } from 'antd'
import { Table } from '../../components/ResponsiveTable'
import { Button, Modal } from '../../components/FinanceControls'
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { quotationService } from '../../services/quotationService'
import CreateInvoiceAction from './CreateInvoiceAction'
import './QuotationPage.css'

const money = (value) => value == null ? '-' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)
const date = (value) => value ? String(value).slice(0, 10) : '-'
const label = (value) => value ? String(value).replaceAll('_', ' ') : '-'
const number = (row) => `${row.no == null || row.numberYear == null ? 'Draft' : `${row.no}/${row.numberYear}`}${row.revision ? ` - Revision ${row.revision}` : ''}`
const terms = [
  ['subject', 'Subject'], ['termOfPayment', 'Term of Payment'], ['validity', 'Validity'],
  ['supplyAkura', 'Akura Supply'], ['supplyCustomer', 'Customer Supply'], ['location', 'Location'],
  ['accomplished', 'Completion Time'], ['deliveryReports', 'Delivery Reports'],
]
const errorText = (error) => error.status === 403
  ? 'Your account cannot read quotations through the current API. Ask an administrator to enable quotation read access for Finance.'
  : error.message

export default function QuotationPage({ currentUser }) {
  const [query, setQuery] = useState({ page: 1, limit: 20 })
  const [data, setData] = useState({ quotations: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [detail, setDetail] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [openingId, setOpeningId] = useState(null)
  const detailController = useRef(null)
  useEffect(() => () => detailController.current?.abort(), [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    quotationService.list(query, { signal: controller.signal }).then((response) => {
      if (!controller.signal.aborted) setData(response.data)
    }).catch((err) => {
      if (!controller.signal.aborted) { setError(errorText(err)); setData({ quotations: [], pagination: { total: 0 } }) }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [query, retry])

  const view = async (row) => {
    detailController.current?.abort()
    const controller = new AbortController()
    detailController.current = controller
    setOpeningId(row.id)
    setDetailError('')
    try {
      const response = await quotationService.get(row.id, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (!response.data?.id) throw new Error('Invalid quotation detail response.')
      setDetail(response.data)
      setDetailOpen(true)
    } catch (err) { if (!controller.signal.aborted) setDetailError(errorText(err)) }
    finally { if (!controller.signal.aborted) setOpeningId(null) }
  }
  const profile = detail ? [
    ['Number', detail.no ?? 'Draft'], ['Company', detail.companySnapshot?.name], ['Customer Contact', detail.customerSnapshot], ['Date', date(detail.date)],
    ['Inquiry Method', label(detail.inquiryMethod)], ['Inquiry Date', date(detail.inquiryDate)],
    ...terms.map(([key, title]) => [title, detail[key]]),
    ['Status', label(detail.status)], ['Invoice Status', label(detail.invoiceStatus)],
    ['State', detail.isActive ? 'Active' : 'Inactive'],
    ['Company Type', detail.companySnapshot?.type], ['Company Address', detail.companySnapshot?.address], ['NPWP', detail.companySnapshot?.npwp],
  ] : []
  return <section className="finance-page">
    <div className="finance-heading"><div><Typography.Title level={2}>Quotations</Typography.Title>
      <Typography.Text type="secondary">Check quotation and invoice status, then review details before creating an invoice.</Typography.Text></div>
      <Space><Tag>View only</Tag><Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRetry((value) => value + 1)}>Refresh</Button></Space>
    </div>
    {error && <Alert className="finance-error" type="error" showIcon title="Unable to load quotations" description={error} action={<Button onClick={() => setRetry((value) => value + 1)}>Retry</Button>} />}
    {detailError && <Alert className="finance-error" type="error" showIcon title="Unable to open quotation" description={detailError} />}
    <Card><Table rowKey="id" loading={loading} dataSource={data.quotations || []} scroll={{ x: 1350 }} columns={[
      { title: 'Number', dataIndex: 'no', width: 190, render: (value) => value ?? 'Draft' },
      { title: 'Date', dataIndex: 'date', width: 130, render: date },
      { title: 'Subject', dataIndex: 'subject', width: 240 },
      { title: 'Customer Contact', dataIndex: 'customerSnapshot', width: 190 },
      { title: 'Status', dataIndex: 'status', width: 190, render: (value) => <Tag>{label(value)}</Tag> },
      { title: 'Invoice Status', dataIndex: 'invoiceStatus', width: 170, render: (value) => <Tag>{label(value)}</Tag> },
      { title: 'State', dataIndex: 'isActive', render: (value) => <Tag>{value ? 'Active' : 'Inactive'}</Tag> },
      { title: 'Total', dataIndex: 'total', width: 180, render: money },
      { title: 'Actions', key: 'actions', width: 140, fixed: 'right', render: (_, row) => <Space>
        <Button type="text" icon={<EyeOutlined />} loading={openingId === row.id} aria-label={`View quotation ${number(row)}`} onClick={() => view(row)} />
        <CreateInvoiceAction currentUser={currentUser} quotation={row} onCreated={() => setRetry((value) => value + 1)} />
      </Space> },
    ]} locale={{ emptyText: error ? 'Quotations could not be loaded.' : 'No quotations available.' }} pagination={{
      current: query.page, pageSize: query.limit, total: data.pagination?.total || 0, showSizeChanger: true,
      pageSizeOptions: [10, 20, 50, 100], onChange: (page, limit) => setQuery({ page: limit !== query.limit ? 1 : page, limit }),
    }} /></Card>
    <Modal rootClassName="finance-quotation-modal" title={detail ? `Quotation ${detail.no ?? 'Draft'}` : 'Quotation'} open={detailOpen} width={1080}
      onCancel={() => setDetailOpen(false)} afterClose={() => { if (!detailOpen) setDetail(null) }} destroyOnHidden
      footer={<Button onClick={() => setDetailOpen(false)}>Close</Button>}>
      {detail && <div className="finance-quotation-detail">
        <section className="finance-quotation-section">
          <div className="finance-quotation-section-heading"><h3>Quotation Information</h3></div>
          <dl className="finance-quotation-detail-fields">{profile.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || '-'}</dd></div>)}
            <div><dt>Quotation ID</dt><dd><Typography.Text copyable>{detail.id}</Typography.Text></dd></div>
          </dl>
        </section>
        <section className="finance-quotation-section">
        <div className="finance-quotation-section-heading"><h3>Quotation Items</h3><Typography.Text type="secondary">Items include historical inactive lines. Stored totals belong to this document.</Typography.Text></div>
        <Table rowKey="id" dataSource={detail.items || []} pagination={false} scroll={{ x: 1580 }} columns={[
          { title: 'State', dataIndex: 'isActive', width: 110, render: (value) => <Tag>{value ? 'Active' : 'Inactive'}</Tag> },
          { title: 'Service', dataIndex: 'serviceName', width: 240 }, { title: 'Type', dataIndex: 'serviceType', width: 100 },
          { title: 'Item', dataIndex: 'itemName', width: 220 }, { title: 'Size', dataIndex: 'size', width: 120 },
          { title: 'Inspection Quantity', dataIndex: 'quantityInspection', width: 160 }, { title: 'Maintenance Quantity', dataIndex: 'quantityMaintenance', width: 170 },
          { title: 'Inspection Price', dataIndex: 'priceInspection', width: 150, render: money }, { title: 'Maintenance Price', dataIndex: 'priceMaintenance', width: 160, render: money },
          { title: 'Subtotal', dataIndex: 'subTotal', width: 150, render: money },
        ]} />
        </section>
        <section className="finance-quotation-section">
        <div className="finance-quotation-section-heading"><h3>Quotation Totals</h3></div>
        <div className="finance-quotation-totals"><span>Subtotal: <strong>{money(detail.subTotal)}</strong></span>
          <span>Tax ({detail.tax}%): <strong>{money(detail.taxAmount)}</strong></span><span>Total: <strong>{money(detail.total)}</strong></span></div>
        </section>
      </div>}
    </Modal>
  </section>
}
