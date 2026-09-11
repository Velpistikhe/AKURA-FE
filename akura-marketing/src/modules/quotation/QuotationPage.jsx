import { useCallback, useEffect, useRef, useState } from 'react'
import { App, Button, Card, DeleteOutlined, EditOutlined, Form, Modal, PlusOutlined, Popconfirm, Space, Table, Tag, Typography, useSaveConfirmation } from '../../components/global'
import { quotationService } from '../../services/quotationService'
import QuotationForm from './QuotationForm'
import { TEXT_FIELDS, dateValue, displayEnum, money, quotationChanges, quotationNumber } from './quotationModel'
import '../company/CompanyPage.css'
import './QuotationPage.css'

export default function QuotationPage({ onCreate }) {
  const { message } = App.useApp()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [form] = Form.useForm()
  const [records, setRecords] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [openingId, setOpeningId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [stale, setStale] = useState(false)
  const requestRef = useRef(0)
  const detailRequestRef = useRef(0)
  const savingRef = useRef(false)

  const load = useCallback(async () => {
    const request = ++requestRef.current
    setLoading(true)
    try {
      const response = await quotationService.list({ page, limit: pageSize })
      if (request !== requestRef.current) return
      setRecords(response.data?.quotations || [])
      setTotal(response.data?.pagination?.total || 0)
    } catch (error) {
      if (request === requestRef.current) message.error(error.message)
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }, [page, pageSize, message])
  useEffect(() => { load(); return () => { requestRef.current++ } }, [load])

  const view = async (record, edit = false) => {
    const request = ++detailRequestRef.current
    setOpeningId(record.id)
    try {
      const response = await quotationService.get(record.id)
      if (request !== detailRequestRef.current) return
      if (!response.data?.id) throw new Error('Invalid quotation detail.')
      if (edit) { setEditing(response.data); setStale(false); setDetailOpen(false); setOpen(true) }
      else { setDetail(response.data); setDetailOpen(true) }
    } catch (error) { message.error(error.message) }
    finally { if (request === detailRequestRef.current) setOpeningId(null) }
  }

  const save = async (values) => {
    if (savingRef.current || stale || !editing) return
    const changes = quotationChanges(values, editing)
    if (!Object.keys(changes).length) { message.warning('No changes were made.'); return }
    savingRef.current = true
    setSaving(true)
    try {
      if (!await confirmSave('quotation')) return
      const response = await quotationService.update(editing.id, { ...changes, version: editing.version })
      message.success('Quotation updated successfully.')
      setOpen(false)
      setDetail(response.data)
      setDetailOpen(true)
      await load()
    } catch (error) {
      message.error(error.message)
      if (error.status === 409) {
        if (editing) { setStale(true); message.warning('This quotation has changed. Reopen it to review the latest data before saving again.') }
        await load()
      }
    } finally { savingRef.current = false; setSaving(false) }
  }

  const remove = async (record) => {
    setDeletingId(record.id)
    try {
      await quotationService.remove(record.id, record.version)
      message.success('Quotation deleted successfully.')
      if (detail?.id === record.id) setDetailOpen(false)
      if (records.length === 1 && page > 1) setPage(page - 1)
      else await load()
    } catch (error) {
      message.error(error.message)
      if (error.status === 409) { message.warning('The quotation has changed. Review the latest data before trying again.'); await load() }
    } finally { setDeletingId(null) }
  }

  const itemColumns = [
    { title: 'Service', dataIndex: 'serviceName', width: 240 },
    { title: 'Type', dataIndex: 'serviceType', width: 100 },
    { title: 'Item', dataIndex: 'itemName', width: 220 },
    { title: 'Size', dataIndex: 'size', width: 120 },
    { title: 'Quantity', dataIndex: 'quantity', width: 110 },
    { title: 'Unit Price', dataIndex: 'unitPrice', width: 150, render: money },
    { title: 'Subtotal', dataIndex: 'subTotal', width: 150, render: money },
  ]
  const columns = [
    { title: 'Number', key: 'number', width: 190, render: (_, record) => quotationNumber(record) },
    { title: 'Date', dataIndex: 'date', width: 120, render: (value) => dateValue(value) || 'Draft' },
    { title: 'Subject', dataIndex: 'subject', width: 260 },
    { title: 'Customer Contact', dataIndex: 'customerSnapshot', width: 200 },
    { title: 'Status', dataIndex: 'status', width: 200, render: (value) => <Tag>{displayEnum(value)}</Tag> },
    { title: 'Total', dataIndex: 'total', width: 150, render: money },
    { title: 'Actions', key: 'actions', width: 140, fixed: 'right', render: (_, record) => <Space>
      <Button variant="link" busy={openingId === record.id} onClick={() => view(record)}>View</Button>
      <Popconfirm title="Delete quotation?" description="The quotation and its items will be deactivated." okText="Delete" cancelText="Cancel" onConfirm={() => remove(record)}>
        <Button variant="text" isDanger icon={<DeleteOutlined />} busy={deletingId === record.id} aria-label={`Delete quotation ${record.no}`} />
      </Popconfirm>
    </Space> },
  ]
  const detailFields = detail ? [
    ['Number', quotationNumber(detail)], ['Customer Contact', detail.customerSnapshot], ['Date', dateValue(detail.date) || 'Draft'],
    ['Inquiry Method', displayEnum(detail.inquiryMethod)], ['Inquiry Date', dateValue(detail.inquiryDate)],
    ...TEXT_FIELDS.map(([key, label]) => [label, detail[key]]),
    ['Status', displayEnum(detail.status)], ['Invoice Status', displayEnum(detail.invoiceStatus)],
  ] : []

  return <section className="company-page quotation-page">
    {saveConfirmation}
    <div className="company-page-heading">
      <div><Typography.Title level={2}>Quotation Management</Typography.Title><Typography.Text tone="secondary">Manage customer quotations and their items.</Typography.Text></div>
      <Button variant="primary" icon={<PlusOutlined />} onClick={onCreate}>Add Quotation</Button>
    </div>
    <Card><Table rowKey="id" columns={columns} dataSource={records} busy={loading} scroll={{ x: 1260 }} pagination={{
      current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], showTotal: (count) => `${count} quotations`,
      onChange: (next, size) => { setPage(size !== pageSize ? 1 : next); setPageSize(size) },
    }} /></Card>
    <Modal title={editing ? `Edit Quotation ${quotationNumber(editing)}` : 'Edit Quotation'} visible={open} width={1080}
      okText="Save" cancelText="Cancel" busy={saving} onOk={() => form.submit()} okButtonProps={{ disabled: stale }}
      onCancel={() => { if (!saving) setOpen(false) }} cancelButtonProps={{ disabled: saving }} closable={!saving} mask={{ closable: !saving }} unmountOnClose>
      {editing && <QuotationForm key={`${editing.id}-${editing.version}`} form={form} record={editing} saving={saving || stale} onFinish={save} />}
      {stale && <Typography.Text tone="warning">Close this form and reopen the quotation to load the latest data.</Typography.Text>}
    </Modal>
    <Modal title={detail ? `Quotation ${quotationNumber(detail)}` : 'Quotation'} visible={detailOpen} width={1080} unmountOnClose
      onCancel={() => setDetailOpen(false)} afterClose={() => setDetail(null)} footer={detail && <Button variant="primary" icon={<EditOutlined />} busy={openingId === detail.id} onClick={() => view(detail, true)}>Update Quotation</Button>}>
      {detail && <div className="quotation-detail">
        <div className="quotation-detail-fields">{detailFields.map(([label, value]) => <div key={label}><Typography.Text tone="secondary">{label}</Typography.Text><strong>{value || '-'}</strong></div>)}</div>
        <Table rowKey="id" columns={itemColumns} dataSource={(detail.items || []).filter((item) => item.isActive !== false)} pagination={false} scroll={{ x: 1090 }} />
        <div className="quotation-totals"><span>Subtotal: <strong>{money(detail.subTotal)}</strong></span><span>Tax ({detail.tax}%): <strong>{money(detail.taxAmount)}</strong></span><span>Total: <strong>{money(detail.total)}</strong></span></div>
      </div>}
    </Modal>
  </section>
}
