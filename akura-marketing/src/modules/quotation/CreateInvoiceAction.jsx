import { useRef, useState } from 'react'
import { App, Alert, Button, Form, Input, Popconfirm, Tooltip } from 'antd'
import { Modal } from '../../components/global'
import { FileAddOutlined } from '@ant-design/icons'
import { apiRequest } from '../../services/api'
import { canCreateInvoice, invoicePayload } from './invoiceActionModel'

export default function CreateInvoiceAction({ currentUser, quotation, onCreated }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const allowed = canCreateInvoice(currentUser, quotation)
  const save = async (values) => {
    if (!allowed || lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      const response = await apiRequest(`/marketing/quotation-references/${encodeURIComponent(quotation.id)}`)
      if (!canCreateInvoice(currentUser, response.data)) throw new Error('This quotation is no longer eligible for invoice creation. Refresh the quotation list.')
      await apiRequest('/finance/invoices', { method: 'POST', body: JSON.stringify(invoicePayload(values, response.data)) })
      setOpen(false)
      message.success('Invoice created successfully.')
      await onCreated?.()
    } catch (err) { setError(err.message) }
    finally { lock.current = false; setBusy(false) }
  }
  if (!allowed) return null
  return <>
    <Popconfirm title="Create invoice?" description={`Create an invoice from quotation ${quotation.no ?? ''}?`} okText="Continue" cancelText="Cancel" onConfirm={() => {
      form.resetFields(); form.setFieldsValue({ title: quotation.subject || '' }); setError(''); setOpen(true)
    }}>
      <Tooltip title="Create Invoice"><Button className="akura-button finance-button" type="text" icon={<FileAddOutlined />} aria-label={`Create invoice for quotation ${quotation.no ?? ''}`} disabled={busy} /></Tooltip>
    </Popconfirm>
    <Modal rootClassName="finance-modal" title="Create Invoice" open={open} onOk={() => form.submit()} okText="Save Invoice" confirmLoading={busy}
      onCancel={() => { if (!busy) setOpen(false) }} closable={!busy} mask={{ closable: !busy }} keyboard={!busy} cancelButtonProps={{ disabled: busy }} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} disabled={busy}>
        <Form.Item label="Quotation"><Input value={String(quotation.no ?? quotation.id)} disabled /></Form.Item>
        <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true }, { max: 255 }]}><Input maxLength={255} /></Form.Item>
        <Form.Item label="Invoice Number and Date"><Input value="Assigned automatically" disabled /></Form.Item>
        <Form.Item name="dueDate" label="Due Date"><Input type="date" /></Form.Item>
        <Form.Item name="notes" label="Notes" rules={[{ max: 20000 }]}><Input.TextArea rows={3} maxLength={20000} /></Form.Item>
        {error && <Alert type="error" showIcon title={error} />}
      </Form>
    </Modal>
  </>
}
