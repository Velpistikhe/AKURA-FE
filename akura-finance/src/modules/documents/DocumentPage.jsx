import TableSearchFilter from '../../components/global/TableSearchFilter'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, App, Card, Form, Popconfirm, Space, Tag, Typography } from 'antd'
import { Table } from '../../components/ResponsiveTable'
import { EyeOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Modal } from '../../components/FinanceControls'
import { documentService } from '../../services/documentService'
import { canEdit, canFinalize, dateValue, documentPayload, formValues, money } from './documentModel'
import DocumentForm from './DocumentForm'

const displayEnum = (value) => value ? String(value).replaceAll('_', ' ') : '-'
const itemColumns = [
  { title: 'Service', dataIndex: 'serviceName', width: 240, render: (value) => value || 'Standalone' },
  { title: 'Type', dataIndex: 'serviceType', width: 100, render: (value) => value || '-' },
  { title: 'Item', dataIndex: 'itemName', width: 220, render: (value, item) => <div className="finance-item-note-cell">
    <span>{value}</span>
    {item.note ? <Typography.Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>{item.note}</Typography.Text> : null}
  </div> },
  { title: 'Size', dataIndex: 'size', width: 120, render: (value) => value ?? 'Without size' },
  { title: 'Inspection Quantity', dataIndex: 'quantityInspection', width: 160 },
  { title: 'Maintenance Quantity', dataIndex: 'quantityMaintenance', width: 170 },
  { title: 'Inspection Price', dataIndex: 'priceInspection', width: 150, align: 'right', render: money },
  { title: 'Maintenance Price', dataIndex: 'priceMaintenance', width: 160, align: 'right', render: money },
  { title: 'Subtotal', dataIndex: 'subTotal', width: 150, align: 'right', render: money },
]
export default function DocumentPage({ kind, title }) {
  const service = useMemo(() => documentService(kind), [kind])
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [query, setQuery] = useState({ page: 1, limit: 20, search: '', status: undefined })
  const [data, setData] = useState({ documents: [], pagination: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [detail, setDetail] = useState(null)
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [stale, setStale] = useState(false)
  const [history, setHistory] = useState(null)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyData, setHistoryData] = useState({ history: [], pagination: {} })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const listRequestRef = useRef(0)
  const historyRequestRef = useRef(0)
  useEffect(() => {
    const request = ++listRequestRef.current
    setLoading(true); setError('')
    service.list(query).then((response) => {
      if (request === listRequestRef.current) {
        setData(response.data)
        if (!response.data.documents.length && query.page > 1) setQuery((value) => ({ ...value, page: Math.max(1, response.data.pagination.totalPages) }))
      }
    }).catch((err) => { if (request === listRequestRef.current) { setError(err.message); setData({ documents: [], pagination: {} }) } })
      .finally(() => { if (request === listRequestRef.current) setLoading(false) })
    return () => { listRequestRef.current++ }
  }, [service, query, reload])
  useEffect(() => {
    if (!history) return
    const request = ++historyRequestRef.current
    setHistoryLoading(true); setHistoryError('')
    service.history(history.id, { page: historyPage, limit: 20 }).then((response) => {
      if (request === historyRequestRef.current) setHistoryData(response.data)
    }).catch((err) => { if (request === historyRequestRef.current) setHistoryError(err.message) })
      .finally(() => { if (request === historyRequestRef.current) setHistoryLoading(false) })
    return () => { historyRequestRef.current++ }
  }, [service, history, historyPage])
  const run = async (action) => {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await action() }
    catch (err) {
      message.error(err.message)
      if (err.status === 409) {
        setStale(true); setDetail(null); setReload((value) => value + 1)
        message.warning('Reload the document or quotation before retrying. Check that tax is configured for the document date.')
      }
    } finally { lock.current = false; setBusy(false) }
  }
  const edit = (record = null) => { setEditor({ record }); setStale(false); form.resetFields(); form.setFieldsValue(formValues(record || {})) }
  const open = (record, editing = false) => run(async () => {
    const response = await service.get(record.id)
    if (editing) {
      if (!canEdit(response.data)) throw new Error('Only active draft documents can be edited.')
      edit(response.data)
    } else setDetail(response.data)
  })
  const save = (values) => run(async () => {
    if (stale) return
    const payload = documentPayload(values, editor.record)
    if (!payload) { message.info('No changes were made.'); return }
    const response = editor.record ? await service.update(editor.record.id, payload) : await service.create(payload)
    setEditor(null); setDetail(response.data); setReload((value) => value + 1); message.success(`${title} saved.`)
  })
  const finalize = (record) => run(async () => {
    if (!canFinalize(record)) return
    const response = await service.update(record.id, { version: record.version, status: 'FINAL' })
    setDetail(response.data); setReload((value) => value + 1); message.success(`${title} finalized.`)
  })
  const approve = (record) => run(async () => {
    if (!canEdit(record)) return
    const response = await service.approve(record.id, record.version)
    setDetail(response.data); setReload((value) => value + 1); message.success(`${title} approved.`)
  })
  const remove = (record) => run(async () => {
    await service.remove(record.id, record.version)
    setDetail(null); setReload((value) => value + 1); setHistoryPage(1); setHistory(record); message.success(`${title} deleted.`)
  })
  const detailFields = detail ? [
    ['Number', detail.number], ['Title', detail.title], ['Source', displayEnum(detail.source)], ['Status', displayEnum(detail.status)],
    ['Purchase Order Number', detail.purchaseOrderNumber], ['Purchase Order Date', dateValue(detail.purchaseOrderDate)],
    ['Date', dateValue(detail.date)], ['Due Date', dateValue(detail.dueDate)], ['Location', detail.location],
    ['Company', detail.companySnapshot?.name || detail.quotationSnapshot?.companySnapshot?.name],
    ...(['QUOTATION'].includes(detail.source) ? [['Quotation', detail.quotationSnapshot?.subject]] : []),
    ['State', detail.isActive === false ? 'Inactive' : 'Active'], ['Notes', detail.notes],
  ] : []
  return <section className="finance-page">
    <div className="finance-heading"><div><Typography.Title level={2}>{title}</Typography.Title><Typography.Text type="secondary">Manage invoices and proforma invoices from purchase orders.</Typography.Text></div>
      <Button icon={<PlusOutlined />} type="primary" onClick={() => edit()} disabled={busy}>Add {title}</Button></div>
    {error && <Alert className="finance-error" type="error" showIcon title="Unable to load documents" description={error} />}
    <Card><Table rowKey="id" loading={loading} dataSource={data.documents} scroll={{ x: 1100 }} columns={[
      { title: 'Number', dataIndex: 'number', key: 'search', filteredValue: query.search ? [query.search] : null,
        filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search number or title" /> }, { title: 'Title', dataIndex: 'title' },
      { title: 'Date', dataIndex: 'date', render: dateValue }, { title: 'Due Date', dataIndex: 'dueDate', render: (value) => dateValue(value) || '-' },
      { title: 'Status', dataIndex: 'status', filters: ['DRAFT', 'ON_PROGRESS', 'FINAL'].map((value) => ({ text: value, value })), filterMultiple: false, filteredValue: query.status ? [query.status] : null, render: (value) => <Tag>{value}</Tag> }, { title: 'Total', dataIndex: 'total', render: money },
      { title: 'Actions', width: 130, fixed: 'right', render: (_, record) => <Space><Button type="text" icon={<EyeOutlined />} aria-label={`View ${record.number}`} disabled={busy} onClick={() => open(record)} /><Button type="text" icon={<HistoryOutlined />} aria-label={`History ${record.number}`} disabled={busy} onClick={() => { setHistoryPage(1); setHistory(record) }} /></Space> },
     ]} onChange={(_, filters, _sorter, extra) => {
      if (extra.action === 'filter') setQuery((current) => ({ ...current, page: 1, search: (filters.search?.[0] || '').trim(), status: filters.status?.[0] }))
    }} pagination={{ current: query.page, pageSize: query.limit, total: data.pagination.total || 0, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], onChange: (page, limit) => setQuery((value) => ({ ...value, page: limit !== value.limit ? 1 : page, limit })) }} /></Card>
    <Modal width={1180} rootClassName="finance-document-modal" title={`${editor?.record ? 'Edit' : 'Add'} ${title}`} open={Boolean(editor)} onCancel={() => { if (!busy) setEditor(null) }} onOk={() => form.submit()} confirmLoading={busy} okButtonProps={{ disabled: stale }} cancelButtonProps={{ disabled: busy }} closable={!busy} mask={{ closable: !busy }} destroyOnHidden>
      {editor && <DocumentForm form={form} record={editor.record} busy={busy} stale={stale} onFinish={save} />}
    </Modal>
    <Modal title={detail?.number ? `${title} ${detail.number}` : title} open={Boolean(detail)} onCancel={() => { if (!busy) setDetail(null) }} closable={!busy} mask={{ closable: !busy }} width={1080} footer={detail && <Space wrap>
      {canEdit(detail) && <><Button disabled={busy} onClick={() => open(detail, true)}>Edit</Button><Popconfirm title="Approve document?" description="Move this draft to ON_PROGRESS." onConfirm={() => approve(detail)}><Button type="primary" disabled={busy}>Approve</Button></Popconfirm></>}
      {canFinalize(detail) && <Popconfirm title="Finalize document?" description="Final documents cannot be edited. Tax will be checked again." onConfirm={() => finalize(detail)}><Button type="primary" disabled={busy}>Finalize</Button></Popconfirm>}
      <Popconfirm title="Delete document?" description="The document will be deactivated and retained in history." onConfirm={() => remove(detail)}><Button danger disabled={busy}>Delete</Button></Popconfirm>
      <Button disabled={busy} onClick={() => { setHistoryPage(1); setHistory(detail) }}>History</Button>
    </Space>}>
      {detail && <div className="finance-detail">
        <section className="finance-detail-section">
          <div className="finance-detail-section-heading"><h3>{title} Information</h3></div>
          <dl className="finance-detail-grid">{detailFields.map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{value || '-'}</dd></div>)}</dl>
        </section>
        <section className="finance-detail-section">
          <div className="finance-detail-section-heading"><div><h3>{title} Items</h3><Typography.Text type="secondary">Items include historical inactive lines. Stored totals belong to this document.</Typography.Text></div></div>
          <Table rowKey="id" pagination={false} scroll={{ x: 1580 }} dataSource={(detail.items || detail.quotationSnapshot?.items || []).filter((item) => item.isActive !== false)} columns={itemColumns} />
        </section>
        <section className="finance-detail-section">
          <div className="finance-detail-section-heading"><h3>{title} Totals</h3></div>
          <div className="finance-totals"><span>Subtotal: <strong>{money(detail.subTotal)}</strong></span><span>Tax ({detail.tax ?? '-'}%): <strong>{money(detail.taxAmount)}</strong></span><span>Total: <strong>{money(detail.total)}</strong></span></div>
        </section>
      </div>}
    </Modal>
    <Modal title={`History: ${history?.number || ''}`} open={Boolean(history)} onCancel={() => setHistory(null)} footer={null} width={1000}>
      {historyError ? <Alert type="error" title={historyError} action={<Button onClick={() => setHistory({ ...history })}>Retry</Button>} /> : <Table rowKey="id" loading={historyLoading} dataSource={historyData.history} columns={[
        { title: 'Action', dataIndex: 'actionLabel' }, { title: 'Changed By', render: (_, row) => row.changedBy?.name }, { title: 'Date', dataIndex: 'changedAt' }, { title: 'Reason', dataIndex: 'reason' },
      ]} expandable={{ expandedRowRender: (row) => <Table rowKey="field" pagination={false} dataSource={row.changes} columns={[
        { title: 'Field', dataIndex: 'label' }, ...['before', 'after'].map((key) => ({ title: key === 'before' ? 'Before' : 'After', dataIndex: key, render: (value) => value == null ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value) })),
      ]} /> }} pagination={{ current: historyPage, pageSize: 20, total: historyData.pagination.total || 0, showSizeChanger: false, onChange: setHistoryPage }} />}
    </Modal>
  </section>
}
