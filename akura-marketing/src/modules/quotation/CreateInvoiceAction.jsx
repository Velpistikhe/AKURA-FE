import { useRef, useState } from 'react'
import { App, Button, DollarOutlined, Form, Input, Popconfirm, Select, Tooltip, Typography } from '../../components/global'
import { Modal } from '../../components/global'
import { quotationService } from '../../services/quotationService'
import { canCreateFinanceDocument, FINANCE_DOCUMENT_KINDS, financeDocumentDate, financeDocumentPayload, validateFinanceDocumentDate, validatePurchaseOrderDate } from './invoiceActionModel'

export default function CreateInvoiceAction({ currentUser, quotation, onCreated }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const allowed = canCreateFinanceDocument(currentUser, quotation)
  const save = async (values) => {
    if (!allowed || lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      await quotationService.createInvoice(quotation.id, financeDocumentPayload(quotation.id, values))
      setOpen(false)
      message.success(`${values.kind === 'INVOICE' ? 'Invoice' : 'Proforma invoice'} created successfully.`)
      await onCreated?.()
    } catch (err) {
      setError(err.message)
      if ([403, 404, 409].includes(err.status)) await onCreated?.()
      if (err.status === 503) setError('Finance service unavailable. Try again later.')
    } finally { lock.current = false; setBusy(false) }
  }
  if (!allowed) return null
  return <>
    <Popconfirm title="Create finance document?" description={`Create an invoice or proforma invoice from quotation ${quotation.no ?? ''}?`} okText="Continue" cancelText="Cancel" onConfirm={() => {
      form.resetFields(); form.setFieldsValue({ kind: 'INVOICE' }); setError(''); setOpen(true)
    }}>
      <Tooltip title="Create Invoice / Proforma Invoice"><Button className="akura-button finance-button" type="text" icon={<DollarOutlined />} aria-label={`Create invoice or proforma invoice for quotation ${quotation.no ?? ''}`} disabled={busy} /></Tooltip>
    </Popconfirm>
    <Modal rootClassName="finance-modal" title="Create Invoice / Proforma Invoice" open={open} onOk={() => form.submit()} okText="Create Document" confirmLoading={busy}
      onCancel={() => { if (!busy) setOpen(false) }} closable={!busy} mask={{ closable: !busy }} keyboard={!busy} cancelButtonProps={{ disabled: busy }} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} disabled={busy}>
        <Form.Item label="Quotation"><Input value={String(quotation.no ?? quotation.id)} disabled /></Form.Item>
        <Form.Item name="kind" label="Document Type" rules={[{ required: true }]}><Select options={FINANCE_DOCUMENT_KINDS} /></Form.Item>
        <Form.Item name="dueDate" label="Due Date" rules={[{ required: true, message: 'Due date is required.' }, { validator: (_, value) => {
          const error = validateFinanceDocumentDate(value)
          return error ? Promise.reject(new Error(error)) : Promise.resolve()
        } }]}><Input type="date" min={financeDocumentDate()} /></Form.Item>
        <Form.Item name="location" label="Location" rules={[{ required: true, whitespace: true, transform: (value) => value?.trim(), max: 255, message: 'Location is required and must not exceed 255 characters.' }]}><Input maxLength={255} /></Form.Item>
        <Form.Item name="purchaseOrderNumber" label="Purchase Order Number" rules={[{ required: true, whitespace: true, transform: (value) => value?.trim(), max: 100 }]}><Input maxLength={100} /></Form.Item>
        <Form.Item name="purchaseOrderDate" label="Purchase Order Date" rules={[{ required: true }, { validator: (_, value) => {
          const error = validatePurchaseOrderDate(value)
          return error ? Promise.reject(new Error(error)) : Promise.resolve()
        } }]}><Input type="date" /></Form.Item>
        {error && <Typography.Text tone="danger" role="alert">{error}</Typography.Text>}
      </Form>
    </Modal>
  </>
}

