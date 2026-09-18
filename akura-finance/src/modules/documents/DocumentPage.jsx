import TableSearchFilter from '../../components/global/TableSearchFilter'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, App, Card, Form, Input, Popconfirm, Space, Tag, Typography } from 'antd'
import { Table } from '../../components/ResponsiveTable'
import { EyeOutlined, HistoryOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Modal } from '../../components/FinanceControls'
import { documentService, getQuotationReference } from '../../services/documentService'
import { canEdit, dateValue, documentPayload, formValues, money } from './documentModel'

const uuidRule = { pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message: 'Enter a valid quotation ID.' }
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
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    service.list(query, { signal: controller.signal }).then((response) => {
      if (!controller.signal.aborted) {
        setData(response.data)
        if (!response.data.documents.length && query.page > 1) setQuery((value) => ({ ...value, page: Math.max(1, response.data.pagination.totalPages) }))
      }
    }).catch((err) => { if (!controller.signal.aborted) { setError(err.message); setData({ documents: [], pagination: {} }) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [service, query, reload])
  useEffect(() => {
    if (!history) return
    const controller = new AbortController()
    setHistoryLoading(true); setHistoryError('')
    service.history(history.id, { page: historyPage, limit: 20 }, { signal: controller.signal }).then((response) => {
      if (!controller.signal.aborted) setHistoryData(response.data)
    }).catch((err) => { if (!controller.signal.aborted) setHistoryError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false) })
    return () => controller.abort()
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
    let quotation
    if (!editor.record) {
      quotation = (await getQuotationReference(values.quotationId.trim())).data
      if (!quotation?.isActive || quotation.no == null || quotation.numberYear == null) throw new Error('Select an active, numbered quotation. Approve draft quotations first.')
    }
    const payload = documentPayload(values, editor.record, quotation, kind)
    if (!payload) { message.info('No changes were made.'); return }
    const response = editor.record ? await service.update(editor.record.id, payload) : await service.create(payload)
    setEditor(null); setDetail(response.data); setReload((value) => value + 1); message.success(`${title} saved.`)
  })
  const finalize = (record) => run(async () => {
    const response = await service.update(record.id, { version: record.version, status: 'FINAL' })
    setDetail(response.data); setReload((value) => value + 1); message.success(`${title} finalized.`)
  })
  const remove = (record) => run(async () => {
    await service.remove(record.id, record.version)
    setDetail(null); setReload((value) => value + 1); setHistoryPage(1); setHistory(record); message.success(`${title} deleted.`)
  })
  return <section className="finance-page">
    <div className="finance-heading"><div><Typography.Title level={2}>{title}</Typography.Title><Typography.Text type="secondary">Manage documents created from customer quotations.</Typography.Text></div>
      <Space wrap><Button icon={<ReloadOutlined />} onClick={() => setReload((value) => value + 1)} disabled={busy}>Refresh</Button><Button icon={<PlusOutlined />} type="primary" onClick={() => edit()} disabled={busy}>Add {title}</Button></Space></div>
    {error && <Alert className="finance-error" type="error" showIcon title="Unable to load documents" description={error} />}
    <Card><Table rowKey="id" loading={loading} dataSource={data.documents} scroll={{ x: 1100 }} columns={[
      { title: 'Number', dataIndex: 'number', key: 'search', filteredValue: query.search ? [query.search] : null,
        filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search number or title" /> }, { title: 'Title', dataIndex: 'title' },
      { title: 'Date', dataIndex: 'date', render: dateValue }, { title: 'Due Date', dataIndex: 'dueDate', render: (value) => dateValue(value) || '-' },
      { title: 'Status', dataIndex: 'status', filters: ['DRAFT', 'FINAL'].map((value) => ({ text: value, value })), filterMultiple: false, filteredValue: query.status ? [query.status] : null, render: (value) => <Tag>{value}</Tag> }, { title: 'Total', dataIndex: 'total', render: money },
      { title: 'Actions', width: 130, fixed: 'right', render: (_, record) => <Space><Button type="text" icon={<EyeOutlined />} aria-label={`View ${record.number}`} disabled={busy} onClick={() => open(record)} /><Button type="text" icon={<HistoryOutlined />} aria-label={`History ${record.number}`} disabled={busy} onClick={() => { setHistoryPage(1); setHistory(record) }} /></Space> },
     ]} onChange={(_, filters, _sorter, extra) => {
      if (extra.action === 'filter') setQuery((current) => ({ ...current, page: 1, search: (filters.search?.[0] || '').trim(), status: filters.status?.[0] }))
    }} pagination={{ current: query.page, pageSize: query.limit, total: data.pagination.total || 0, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], onChange: (page, limit) => setQuery((value) => ({ ...value, page: limit !== value.limit ? 1 : page, limit })) }} /></Card>
    <Modal title={`${editor?.record ? 'Edit' : 'Add'} ${title}`} open={Boolean(editor)} onCancel={() => { if (!busy) setEditor(null) }} onOk={() => form.submit()} confirmLoading={busy} okButtonProps={{ disabled: stale }} cancelButtonProps={{ disabled: busy }} closable={!busy} mask={{ closable: !busy }} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} disabled={busy || stale}>
        {!editor?.record && <Form.Item name="quotationId" label="Quotation ID" extra="Use the ID of an active, approved quotation." rules={[{ required: true }, uuidRule]}><Input /></Form.Item>}
        {kind !== 'invoices' && <Typography.Paragraph type="secondary">Proforma invoice number is assigned automatically.</Typography.Paragraph>}
        <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true }, { max: 255 }]}><Input maxLength={255} /></Form.Item>
        {kind !== 'invoices' && <Form.Item name="date" label="Date" rules={[{ required: true }]}><Input type="date" /></Form.Item>}
        {kind === 'invoices' && <Typography.Paragraph type="secondary">Invoice number and date are assigned automatically.</Typography.Paragraph>}
        <Form.Item name="dueDate" label="Due Date" dependencies={['date']} rules={[({ getFieldValue }) => ({ validator: (_, value) => kind === 'invoices' || !value || value >= getFieldValue('date') ? Promise.resolve() : Promise.reject(new Error('Due date cannot precede document date.')) })]}><Input type="date" /></Form.Item>
        <Form.Item name="notes" label="Notes" rules={[{ max: 20000 }]}><Input.TextArea rows={4} maxLength={20000} /></Form.Item>
        <Typography.Text type="secondary">Subtotal comes from the quotation. Tax and total are calculated automatically for the document date.</Typography.Text>
        {stale && <Alert type="warning" title="Close and reopen this form before retrying." />}
      </Form>
    </Modal>
    <Modal title={detail?.number || title} open={Boolean(detail)} onCancel={() => { if (!busy) setDetail(null) }} closable={!busy} mask={{ closable: !busy }} width={1000} footer={detail && <Space>
      {canEdit(detail) && <><Button disabled={busy} onClick={() => open(detail, true)}>Edit</Button><Popconfirm title="Finalize document?" description="Final documents cannot be edited. Tax will be checked again." onConfirm={() => finalize(detail)}><Button type="primary" disabled={busy}>Finalize</Button></Popconfirm></>}
      <Popconfirm title="Delete document?" description="The document will be deactivated and retained in history." onConfirm={() => remove(detail)}><Button danger disabled={busy}>Delete</Button></Popconfirm>
      <Button disabled={busy} onClick={() => { setHistoryPage(1); setHistory(detail) }}>History</Button>
    </Space>}>
      {detail && <div className="finance-detail">
        <dl className="finance-detail-grid">{[['Title', detail.title], ['Status', detail.status], ['Date', dateValue(detail.date)], ['Due Date', dateValue(detail.dueDate)], ['Company', detail.quotationSnapshot?.companySnapshot?.name], ['Quotation', detail.quotationSnapshot?.subject], ['Notes', detail.notes]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '-'}</dd></div>)}</dl>
        <Table rowKey="id" pagination={false} scroll={{ x: 1000 }} dataSource={(detail.quotationSnapshot?.items || []).filter((item) => item.isActive !== false)} columns={[
          { title: 'Service', dataIndex: 'serviceName' }, { title: 'Item', dataIndex: 'itemName' }, { title: 'Size', dataIndex: 'size' },
          { title: 'Inspection Quantity', dataIndex: 'quantityInspection' }, { title: 'Maintenance Quantity', dataIndex: 'quantityMaintenance' },
          { title: 'Inspection Price', dataIndex: 'priceInspection', render: money }, { title: 'Maintenance Price', dataIndex: 'priceMaintenance', render: money }, { title: 'Subtotal', dataIndex: 'subTotal', render: money },
        ]} />
        <div className="finance-totals"><span>Subtotal: {money(detail.subTotal)}</span><span>Tax ({detail.tax ?? '-'}%): {money(detail.taxAmount)}</span><strong>Total: {money(detail.total)}</strong></div>
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
