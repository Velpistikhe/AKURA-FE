import { useEffect, useMemo, useRef, useState } from 'react'
import { App, Button, Card, DeleteOutlined, Form, Input, Modal, Popconfirm, Select, Table, TableSearchFilter, Typography, useSaveConfirmation } from '../../components/global'
import { PlusOutlined, ToolOutlined } from '@ant-design/icons'
import { quotationService } from '../../services/quotationService'
import { workOrderService } from '../../services/workOrderService'
import { activeQuotationItems, canCreateWorkOrderFromQuotation, emptyItemFilters, filterQuotationItems, workOrderFormComplete, quotationWorkOrderPayload } from '../work-order/workOrderModel'
import { money } from './quotationModel'
import { quotationPdfBlob } from './quotationPdfPreview'
import QuotationWorkOrderItemPicker from './QuotationWorkOrderItemPicker'
import './CreateWorkOrderAction.css'

function WorkOrderModalSkeleton() {
  return <div className="work-order-modal-skeleton" role="status" aria-label="Loading work order form data" aria-busy="true">
    <span className="work-order-modal-skeleton__sr">Loading quotation items and inspector options</span>
    {[0, 1, 2, 3, 4, 5].map((row) => <div className="work-order-modal-skeleton__field" key={row} aria-hidden="true">
      <span className="work-order-modal-skeleton__label" />
      <span className="work-order-modal-skeleton__input" />
    </div>)}
  </div>
}

export default function CreateWorkOrderAction({ currentUser, quotation, onCreated }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inspectors, setInspectors] = useState([])
  const [inspectorsLoading, setInspectorsLoading] = useState(false)
  const [inspectorsError, setInspectorsError] = useState('')
  const [inspectorsRetry, setInspectorsRetry] = useState(0)
  const [quotationDetail, setQuotationDetail] = useState(null)
  const [quotationItems, setQuotationItems] = useState([])
  const [quotationLoading, setQuotationLoading] = useState(false)
  const [quotationError, setQuotationError] = useState(false)
  const [quotationRetry, setQuotationRetry] = useState(0)
  const [selectedItems, setSelectedItems] = useState([])
  const [itemPickerOpen, setItemPickerOpen] = useState(false)
  const [itemFilters, setItemFilters] = useState(emptyItemFilters())
  const [itemPage, setItemPage] = useState(1)
  const [itemLimit, setItemLimit] = useState(10)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [pdfUrl, setPdfUrl] = useState(null)
  const [confirmSave, confirmation] = useSaveConfirmation()
  const lock = useRef(false)
  const pdfController = useRef(null)
  const pdfObjectUrl = useRef(null)
  const allowed = canCreateWorkOrderFromQuotation(currentUser, quotation)
  // Watched values drive the completeness check that disables the submit button.
  const watchedStartDate = Form.useWatch('startDate', form)
  const watchedEndDate = Form.useWatch('endDate', form)
  const watchedInspectors = Form.useWatch('inspectors', form) || []
  const watchedItems = Form.useWatch('items', form) || []
  const formComplete = workOrderFormComplete({ startDate: watchedStartDate, endDate: watchedEndDate, inspectors: watchedInspectors }, watchedItems.length)

  const availableItems = useMemo(() => activeQuotationItems(quotationItems), [quotationItems])
  const selectedItemIds = useMemo(() => selectedItems.map((item) => item.itemSizeId), [selectedItems])
  const filteredSelectedItems = useMemo(() => filterQuotationItems(selectedItems, itemFilters), [selectedItems, itemFilters])

  // Each column filters its own field from the table header search.
  const itemSearchColumn = (key, label, maxLength = 200) => ({
    key, filteredValue: itemFilters[key] ? [itemFilters[key]] : null,
    filterDropdown: (props) => <TableSearchFilter {...props} placeholder={`Search ${label}`} maxLength={maxLength}
      onSearch={(value) => { setItemFilters((current) => ({ ...current, [key]: value.trim() })); setItemPage(1) }} />,
  })

  // Abort an in-flight PDF request and release the blob URL so it never leaks
  // when the modal closes or the row unmounts.
  const closePdfPreview = () => {
    pdfController.current?.abort()
    pdfController.current = null
    if (pdfObjectUrl.current) { URL.revokeObjectURL(pdfObjectUrl.current); pdfObjectUrl.current = null }
    setPdfUrl(null)
    setPdfLoading(false)
    setPdfError('')
  }

  // The quotation id comes from the list row, so opening the modal only fetches
  // the PDF document from the marketing service for the inline preview.
  const loadPdfPreview = () => {
    pdfController.current?.abort()
    if (pdfObjectUrl.current) { URL.revokeObjectURL(pdfObjectUrl.current); pdfObjectUrl.current = null }
    const controller = new AbortController()
    pdfController.current = controller
    setPdfUrl(null)
    setPdfError('')
    setPdfLoading(true)
    quotationService.previewPdf(quotation.id, { signal: controller.signal })
      .then(({ blob }) => quotationPdfBlob(blob))
      .then((file) => {
        if (controller.signal.aborted) return
        pdfObjectUrl.current = URL.createObjectURL(file)
        setPdfUrl(pdfObjectUrl.current)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setPdfError(true)
        message.error(err?.message || 'Unable to preview the quotation PDF.')
      })
      .finally(() => { if (!controller.signal.aborted) setPdfLoading(false) })
  }

  useEffect(() => () => {
    pdfController.current?.abort()
    if (pdfObjectUrl.current) URL.revokeObjectURL(pdfObjectUrl.current)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    let active = true
    setInspectorsLoading(true)
    setInspectorsError('')
    setInspectors([])
    workOrderService.inspectors()
      .then(({ data }) => {
        if (active) setInspectors((data?.inspectors || []).map((inspector) => ({
          id: inspector.id,
          name: [inspector.firstName, inspector.lastName].filter((part) => typeof part === 'string' && part.trim()).map((part) => part.trim()).join(' '),
        })))
      })
      .catch((err) => {
        if (!active) return
        setInspectorsError(true)
        message.error(err?.message || 'Unable to load Field Service inspectors.')
      })
      .finally(() => { if (active) setInspectorsLoading(false) })
    return () => { active = false }
  }, [open, inspectorsRetry, message])

  // The list response contains no quotation lines, so fetch detail before item selection.
  useEffect(() => {
    if (!open) return undefined
    let active = true
    setQuotationLoading(true)
    setQuotationError(false)
    setQuotationDetail(null)
    setQuotationItems([])
    quotationService.get(quotation.id)
      .then(({ data }) => {
        if (!active) return
        const detail = data?.quotation || data
        if (!detail?.id || detail.id !== quotation.id) throw new Error('Invalid quotation detail response.')
                setQuotationDetail(detail)
                setQuotationItems((detail?.items || []).filter((item) => item.isActive !== false))
      })
      .catch((err) => {
        if (!active) return
        setQuotationError(true)
        message.error(err?.message || 'Unable to load quotation items.')
      })
      .finally(() => { if (active) setQuotationLoading(false) })
    return () => { active = false }
  }, [open, quotationRetry, quotation.id, message])

  const openCreateModal = () => {
    form.resetFields()
    setSelectedItems([])
    setItemFilters(emptyItemFilters())
    setItemPage(1)
    setInspectorsLoading(true)
    setQuotationLoading(true)
    setQuotationError(false)
    loadPdfPreview()
    setOpen(true)
  }

  const handleAddItems = (items) => {
    const ids = new Set(selectedItems.map((item) => item.itemSizeId))
    const next = [...selectedItems, ...items.filter((item) => !ids.has(item.itemSizeId))]
    setSelectedItems(next)
    form.setFieldsValue({ items: next.map((item) => item.itemSizeId) })
    setItemPickerOpen(false)
    setItemPage(1)
  }

  const removeSelectedItem = (itemSizeId) => {
    const next = selectedItems.filter((item) => item.itemSizeId !== itemSizeId)
    setSelectedItems(next)
    form.setFieldsValue({ items: next.map((item) => item.itemSizeId) })
    setItemPage(1)
  }
  const closeModal = () => {
    if (saving) return
    setItemPickerOpen(false)
    closePdfPreview()
    setOpen(false)
  }

  const save = async (values) => {
    if (!allowed || lock.current || inspectorsLoading || inspectorsError || quotationLoading || quotationError || !quotationDetail) return
    lock.current = true
    setSaving(true)
    try {
      // The list row carries the eligibility fields; the fetched detail carries the
      // item lines. The backend re-validates active state, APPROVED status, price
      // source and branch before creating the work order.
      if (!canCreateWorkOrderFromQuotation(currentUser, quotation)) throw new Error('This quotation is no longer eligible for a work order. Refresh the quotation list.')
      const payload = quotationWorkOrderPayload(values, quotationDetail, inspectors)
      if (!await confirmSave('work order')) return
      const { data } = await quotationService.createWorkOrder(quotation.id, payload)
      message.success(`Work order ${data.number} created successfully.`)
      closePdfPreview()
      setOpen(false)
      onCreated?.(data)
    } catch (err) { message.error(err?.message || 'Unable to create the work order.') }
    finally { lock.current = false; setSaving(false) }
  }
  if (!allowed) return null
  return <>
    {confirmation}
    <Button variant="text" icon={<ToolOutlined />} title="Create Work Order" aria-label={`Create work order for quotation ${quotation.no ?? ''}`} onClick={openCreateModal} />
    <Modal title="Create Work Order" visible={open} width={1080} onOk={() => form.submit()} okText="Create Work Order" busy={saving}
      okButtonProps={{ disabled: saving || inspectorsLoading || Boolean(inspectorsError) || quotationLoading || Boolean(quotationError) || !formComplete }}
      onCancel={saving ? undefined : closeModal} closable={!saving} maskClosable={!saving} keyboard={!saving} cancelButtonProps={{ disabled: saving }} unmountOnClose>
      <div className="work-order-modal-body">
        <div className="work-order-modal-form">
          {inspectorsLoading || quotationLoading ? <WorkOrderModalSkeleton /> : <Form form={form} layout="vertical" initialValues={{ inspectors: [], items: [] }} onFinish={save}
            onFinishFailed={({ errorFields }) => message.error(errorFields.flatMap(({ errors }) => errors).join(' '))}
            disabled={saving || Boolean(inspectorsError) || Boolean(quotationError)}>
            <div className="work-order-modal-form__row">
              <Form.Item label="Quotation"><Input value={quotation.no ?? quotation.id} disabled /></Form.Item>
              <Form.Item label="Status"><Input value="DRAFT" disabled /></Form.Item>
            </div>
            <div className="work-order-modal-form__row">
              <Form.Item name="startDate" label="Start Date" rules={[{ required: true, message: 'Start date is required.' }]}><Input type="date" /></Form.Item>
              <Form.Item name="endDate" label="End Date" dependencies={['startDate']} rules={[{ required: true, message: 'End date is required for a quotation work order.' }, ({ getFieldValue }) => ({ validator: (_, value) => !value || value >= getFieldValue('startDate') ? Promise.resolve() : Promise.reject(new Error('End date must be on or after start date.')) })]}><Input type="date" /></Form.Item>
            </div>
            <Form.Item name="items" rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one quotation item.' }]} hidden>
              <Input type="hidden" />
            </Form.Item>
            <Form.Item name="inspectors" label="Inspectors" extra="Select up to 100 Field Service users." rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one inspector.' }]}><Select mode="multiple" maxCount={100} loading={inspectorsLoading} options={inspectors.map((inspector) => ({ value: inspector.id, label: inspector.name }))} placeholder="Select inspectors" /></Form.Item>
            <Card className="work-order-modal-items" bordered variant="outlined">
              <div className="work-order-modal-items__heading">
                <div>
                  <Typography.Text strong>Quotation Items</Typography.Text>
                  <Typography.Text tone="secondary"> — {selectedItems.length} of {availableItems.length} quotation items selected</Typography.Text>
                </div>
                <Button variant="primary" icon={<PlusOutlined />} disabled={!quotationDetail || saving || Boolean(quotationError)} onClick={() => setItemPickerOpen(true)}>Add Items</Button>
              </div>
              <Table rowKey="itemSizeId" columns={[
                { title: 'Service', width: 190, ...itemSearchColumn('serviceName', 'service name'), render: (_, row) => row.serviceName || 'Standalone' },
                { title: 'Item', width: 210, ...itemSearchColumn('itemName', 'item name'), render: (_, row) => row.itemName || '-' },
                { title: 'Size', width: 120, ...itemSearchColumn('size', 'size', 100), render: (_, row) => row.size ?? 'Without size' },
                { title: 'Type', dataIndex: 'serviceType', width: 100, render: (value) => value || '-' },
                { title: 'Inspection Qty', dataIndex: 'quantityInspection', width: 130, align: 'right' },
                { title: 'Maintenance Qty', dataIndex: 'quantityMaintenance', width: 150, align: 'right' },
                { title: 'Subtotal', dataIndex: 'subTotal', width: 130, align: 'right', render: money },
                { title: 'Action', key: 'actions', width: 80, render: (_, row) => <Popconfirm title="Remove item?" description="Remove this quotation item from the work order?" okText="Remove" cancelText="Keep" onConfirm={() => removeSelectedItem(row.itemSizeId)}>
                  <Button variant="text" isDanger icon={<DeleteOutlined />} aria-label={`Remove ${row.itemName || 'quotation item'}`} disabled={saving} />
                </Popconfirm> },
              ]} dataSource={filteredSelectedItems} scroll={{ x: 1120 }}
                locale={{ emptyText: Object.values(itemFilters).some(Boolean) ? 'No selected items match the filters.' : 'No quotation items selected. Use Add Items to choose work order lines.' }}
                pagination={{ current: itemPage, pageSize: itemLimit, total: filteredSelectedItems.length, showSizeChanger: true, pageSizeOptions: [10, 20, 50],
                  onChange: (next, size) => { setItemPage(size !== itemLimit ? 1 : next); setItemLimit(size) } }} />
              {selectedItems.length === 0 && <Typography.Text tone="danger" role="alert">Select at least one quotation item before creating the work order.</Typography.Text>}
            </Card>
          </Form>}
          {inspectorsError && <Button disabled={inspectorsLoading} onClick={() => { setInspectorsLoading(true); setInspectorsError(''); setInspectorsRetry((value) => value + 1) }}>Retry loading inspectors</Button>}
          {quotationError && <Button disabled={quotationLoading} onClick={() => { setQuotationLoading(true); setQuotationError(false); setQuotationRetry((value) => value + 1) }}>Retry loading quotation items</Button>}
        </div>
        <section className="work-order-modal-preview" aria-label="Quotation PDF preview">
          <div className="work-order-modal-preview__heading">Quotation PDF</div>
          {pdfLoading && <p className="work-order-modal-preview__status" role="status">Loading PDF preview...</p>}
          {pdfError && <div className="work-order-modal-preview__status">
            <Button disabled={pdfLoading} onClick={loadPdfPreview}>Retry PDF preview</Button>
          </div>}
          {pdfUrl && <iframe title="Quotation PDF preview" src={pdfUrl} className="work-order-modal-preview__frame" />}
        </section>
      </div>
      <QuotationWorkOrderItemPicker visible={itemPickerOpen} items={availableItems} excludedIds={selectedItemIds} saving={saving}
        onAdd={handleAddItems} onCancel={() => setItemPickerOpen(false)} />
    </Modal>
  </>
}
