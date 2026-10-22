import { useEffect, useRef, useState } from 'react'
import { App, Button, Form, Input, Modal, Select, useSaveConfirmation } from '../../components/global'
import { ToolOutlined } from '@ant-design/icons'
import { quotationService } from '../../services/quotationService'
import { workOrderService } from '../../services/workOrderService'
import { canCreateWorkOrderFromQuotation, quotationWorkOrderPayload } from '../work-order/workOrderModel'
import { quotationPdfBlob } from './quotationPdfPreview'
import './CreateWorkOrderAction.css'

function WorkOrderModalSkeleton() {
  return <div className="work-order-modal-skeleton" role="status" aria-label="Loading inspectors" aria-busy="true">
    <span className="work-order-modal-skeleton__sr">Loading inspector options</span>
    {[0, 1, 2, 3, 4].map((row) => <div className="work-order-modal-skeleton__field" key={row} aria-hidden="true">
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
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [pdfUrl, setPdfUrl] = useState(null)
  const [confirmSave, confirmation] = useSaveConfirmation()
  const lock = useRef(false)
  const pdfController = useRef(null)
  const pdfObjectUrl = useRef(null)
  const allowed = canCreateWorkOrderFromQuotation(currentUser, quotation)

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

  const closeModal = () => {
    if (saving) return
    closePdfPreview()
    setOpen(false)
  }

  const save = async (values) => {
    if (!allowed || lock.current || inspectorsLoading || inspectorsError) return
    lock.current = true
    setSaving(true)
    try {
      // No detail fetch: the list row already carries the quotation id, status and
      // eligibility fields. The backend re-validates active state, APPROVED status,
      // contract pricing and branch before creating the work order.
      if (!canCreateWorkOrderFromQuotation(currentUser, quotation)) throw new Error('This quotation is no longer eligible for a work order. Refresh the quotation list.')
      const payload = quotationWorkOrderPayload(values, quotation, inspectors)
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
    <Button variant="text" icon={<ToolOutlined />} title="Create Work Order" aria-label={`Create work order for quotation ${quotation.no ?? ''}`} onClick={() => { form.resetFields(); setInspectorsLoading(true); loadPdfPreview(); setOpen(true) }} />
    <Modal title="Create Work Order" visible={open} width={1080} onOk={() => form.submit()} okText="Create Work Order" busy={saving}
      okButtonProps={{ disabled: saving || inspectorsLoading || Boolean(inspectorsError) }}
      onCancel={saving ? undefined : closeModal} closable={!saving} maskClosable={!saving} keyboard={!saving} cancelButtonProps={{ disabled: saving }} unmountOnClose>
      <div className="work-order-modal-body">
        <div className="work-order-modal-form">
          {inspectorsLoading ? <WorkOrderModalSkeleton /> : <Form form={form} layout="vertical" initialValues={{ inspectors: [] }} onFinish={save}
            onFinishFailed={({ errorFields }) => message.error(errorFields.flatMap(({ errors }) => errors).join(' '))}
            disabled={saving || Boolean(inspectorsError)}>
            <div className="work-order-modal-form__row">
              <Form.Item label="Quotation"><Input value={quotation.no ?? quotation.id} disabled /></Form.Item>
              <Form.Item label="Status"><Input value="DRAFT" disabled /></Form.Item>
            </div>
            <div className="work-order-modal-form__row">
              <Form.Item name="startDate" label="Start Date" rules={[{ required: true, message: 'Start date is required.' }]}><Input type="date" /></Form.Item>
              <Form.Item name="endDate" label="End Date" dependencies={['startDate']} rules={[{ required: true, message: 'End date is required for a quotation work order.' }, ({ getFieldValue }) => ({ validator: (_, value) => !value || value >= getFieldValue('startDate') ? Promise.resolve() : Promise.reject(new Error('End date must be on or after start date.')) })]}><Input type="date" /></Form.Item>
            </div>
            <Form.Item name="inspectors" label="Inspectors" extra="Select up to 100 Field Service users." rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one inspector.' }]}><Select mode="multiple" maxCount={100} loading={inspectorsLoading} options={inspectors.map((inspector) => ({ value: inspector.id, label: inspector.name }))} placeholder="Select inspectors" /></Form.Item>
          </Form>}
          {inspectorsError && <Button disabled={inspectorsLoading} onClick={() => { setInspectorsLoading(true); setInspectorsError(''); setInspectorsRetry((value) => value + 1) }}>Retry loading inspectors</Button>}
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
    </Modal>
  </>
}
