import { useEffect, useMemo, useRef, useState } from 'react'
import { App, Button, Card, Form, Input, InputNumber, Modal, Select, Table, Typography } from '../../components/global'
import { PlusOutlined } from '@ant-design/icons'
import { workOrderService } from '../../services/workOrderService'
import { canCreateWorkOrders, normalizeQuantity, workOrderCreateComplete, workOrderCreatePayload } from './workOrderModel'

const quotationLabel = (quotation) => `${quotation.number ?? 'Draft'}${quotation.numberYear ? `/${quotation.numberYear}` : ''} — ${quotation.subject || 'Quotation'}`
const itemLabel = (item) => `${item.itemName || 'Item'}${item.size ? ` — ${item.size}` : ''}`

export default function WorkOrderCreate({ currentUser, onCreated }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [quotations, setQuotations] = useState([])
  const [quotation, setQuotation] = useState(null)
  const [inspectors, setInspectors] = useState([])
  const [itemRows, setItemRows] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [loadingQuotation, setLoadingQuotation] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  const canCreate = canCreateWorkOrders(currentUser)
  const watchedStartDate = Form.useWatch('startDate', form)
  const watchedEndDate = Form.useWatch('endDate', form)
  const watchedInspectors = Form.useWatch('inspectors', form) || []
  const selectedCount = useMemo(() => itemRows.filter((item) => item.selected).length, [itemRows])
  const complete = workOrderCreateComplete({ startDate: watchedStartDate, endDate: watchedEndDate, inspectors: watchedInspectors }, selectedCount)

  useEffect(() => {
    if (!open) return undefined
    let active = true
    setLoadingOptions(true)
    setError('')
    Promise.all([workOrderService.quotations(), workOrderService.inspectors()])
      .then(([quotationResponse, inspectorResponse]) => {
        if (!active) return
        setQuotations(quotationResponse?.data?.quotations || [])
        setInspectors((inspectorResponse?.data?.inspectors || []).map((user) => ({
          id: user.id,
          name: [user.firstName, user.lastName].filter((part) => typeof part === 'string' && part.trim()).map((part) => part.trim()).join(' '),
        })).filter((user) => user.id && user.name))
      })
      .catch((err) => { if (active) setError(err?.message || 'Gagal memuat quotation dan inspector.') })
      .finally(() => { if (active) setLoadingOptions(false) })
    return () => { active = false }
  }, [open, retry])

  useEffect(() => {
    if (!open || !quotation?.id) {
      setItemRows([])
      return undefined
    }
    let active = true
    setLoadingQuotation(true)
    setError('')
    setItemRows([])
    workOrderService.quotationItems(quotation.id)
      .then(({ data }) => {
        if (!active) return
        const detail = data?.quotation
        if (!detail?.id || detail.id !== quotation.id) throw new Error('Data quotation tidak valid.')
        setItemRows((detail.items || []).map((item) => ({ ...item, selected: false,
          quantityInspection: normalizeQuantity(item.quantityInspection) ?? 0,
          quantityMaintenance: normalizeQuantity(item.quantityMaintenance) ?? 0 })))
      })
      .catch((err) => { if (active) setError(err?.message || 'Gagal memuat item quotation.') })
      .finally(() => { if (active) setLoadingQuotation(false) })
    return () => { active = false }
  }, [open, quotation?.id])

  const openModal = () => {
    form.resetFields()
    setQuotation(null)
    setItemRows([])
    setError('')
    setOpen(true)
  }
  const closeModal = () => { if (!saving) setOpen(false) }
  const updateItem = (itemSizeId, updates) => setItemRows((rows) => rows.map((item) => item.itemSizeId === itemSizeId ? { ...item, ...updates } : item))
  const submit = async (values) => {
    if (lock.current || !quotation || error || loadingQuotation) return
    lock.current = true
    setSaving(true)
    setError('')
    try {
      const payload = workOrderCreatePayload(values, { quotation, items: itemRows, inspectors })
      const { data } = await workOrderService.create(payload)
      message.success(`Work order ${data.number} berhasil dibuat.`)
      setOpen(false)
      onCreated?.(data)
    } catch (err) {
      setError(err?.message || 'Work order gagal dibuat.')
      if ([404, 409].includes(err?.status)) setRetry((value) => value + 1)
    } finally {
      lock.current = false
      setSaving(false)
    }
  }
  if (!canCreate) return null

  return <>
    <Button variant="primary" icon={<PlusOutlined />} onClick={openModal}>Buat Work Order</Button>
    <Modal title="Buat Work Order" visible={open} width={1000} onOk={() => form.submit()} okText="Buat Work Order"
      busy={saving} okButtonProps={{ disabled: saving || loadingOptions || loadingQuotation || !complete }}
      onCancel={closeModal} closable={!saving} maskClosable={!saving} keyboard={!saving} cancelButtonProps={{ disabled: saving }} unmountOnClose>
      <Form form={form} layout="vertical" onFinish={submit} disabled={saving || loadingOptions || loadingQuotation}>
        <div className="work-order-grid">
          <Form.Item label="Quotation" required>
            <Select showSearch optionFilterProp="label" loading={loadingOptions} placeholder="Pilih quotation approved"
              value={quotation?.id} options={quotations.map((row) => ({ value: row.id, label: quotationLabel(row) }))}
              onChange={(id) => { setQuotation(quotations.find((row) => row.id === id) || null); setError('') }} />
          </Form.Item>
          <Form.Item label="Status"><Input value="DRAFT" disabled /></Form.Item>
          <Form.Item name="startDate" label="Tanggal mulai" rules={[{ required: true, message: 'Tanggal mulai wajib diisi.' }]}><Input type="date" /></Form.Item>
          <Form.Item name="endDate" label="Tanggal selesai" dependencies={['startDate']} rules={[
            { required: true, message: 'Tanggal selesai wajib diisi.' },
            ({ getFieldValue }) => ({ validator: (_, value) => !value || !getFieldValue('startDate') || value >= getFieldValue('startDate') ? Promise.resolve() : Promise.reject(new Error('Tanggal selesai harus sama atau setelah tanggal mulai.')) }),
          ]}><Input type="date" /></Form.Item>
        </div>
        <Form.Item name="inspectors" label="Inspector" rules={[{ required: true, type: 'array', min: 1, message: 'Pilih minimal satu inspector.' }]}>
          <Select mode="multiple" maxCount={100} loading={loadingOptions} options={inspectors.map((user) => ({ value: user.id, label: user.name }))} placeholder="Pilih inspector" />
        </Form.Item>

        <Card title={`Item Work Order${itemRows.length ? ` (${selectedCount} dipilih)` : ''}`} bordered variant="outlined">
          {quotation && <Typography.Text tone="secondary">Pilih item dan isi jumlah. Harga tidak ditampilkan.</Typography.Text>}
          <Table rowKey="itemSizeId" busy={loadingQuotation} dataSource={itemRows} pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
            scroll={{ x: 760 }} locale={{ emptyText: quotation ? 'Quotation tidak memiliki item aktif.' : 'Pilih quotation untuk memuat item.' }}
            columns={[
              { title: 'Pilih', width: 80, render: (_, item) => <input aria-label={`Pilih ${item.itemName}`} type="checkbox" checked={item.selected}
                onChange={(event) => updateItem(item.itemSizeId, { selected: event.target.checked })} /> },
              { title: 'Service', dataIndex: 'serviceName', width: 180, render: (value) => value || 'Standalone' },
              { title: 'Item', dataIndex: 'itemName', width: 200, render: (_, item) => itemLabel(item) },
              { title: 'Tipe', dataIndex: 'serviceType', width: 100, render: (value) => value || '-' },
              { title: 'Jumlah inspeksi', width: 155, render: (_, item) => <InputNumber aria-label={`Jumlah inspeksi ${item.itemName}`} min={0} max={999999999999.999} precision={3}
                stringMode value={String(item.quantityInspection)} disabled={!item.selected} onChange={(value) => updateItem(item.itemSizeId, { quantityInspection: value })} style={{ width: 130 }} /> },
              { title: 'Jumlah maintenance', width: 170, render: (_, item) => <InputNumber aria-label={`Jumlah maintenance ${item.itemName}`} min={0} max={999999999999.999} precision={3}
                stringMode value={String(item.quantityMaintenance)} disabled={!item.selected} onChange={(value) => updateItem(item.itemSizeId, { quantityMaintenance: value })} style={{ width: 140 }} /> },
            ]} />
        </Card>
      </Form>
      {error && <div role="alert" style={{ marginTop: 12 }}>{error} <Button disabled={loadingOptions} onClick={() => { setError(''); setLoadingOptions(true); setRetry((value) => value + 1) }}>Coba lagi</Button></div>}
    </Modal>
  </>
}

