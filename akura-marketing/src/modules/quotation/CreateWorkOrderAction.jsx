import { useRef, useState } from 'react'
import { App, Button, Form, Input, Modal, Select, useSaveConfirmation } from '../../components/global'
import { ToolOutlined } from '@ant-design/icons'
import { quotationService } from '../../services/quotationService'
import { canCreateWorkOrderFromQuotation, quotationWorkOrderPayload } from '../work-order/workOrderModel'

export default function CreateWorkOrderAction({ currentUser, quotation }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmSave, confirmation] = useSaveConfirmation()
  const lock = useRef(false)
  const allowed = canCreateWorkOrderFromQuotation(currentUser, quotation)
  const save = async (values) => {
    if (!allowed || lock.current) return
    lock.current = true
    setSaving(true)
    setError('')
    try {
      const { data: latest } = await quotationService.get(quotation.id)
      if (!canCreateWorkOrderFromQuotation(currentUser, latest)) throw new Error('This quotation is no longer eligible for a work order. Refresh the quotation list.')
      if (latest.version !== quotation.version) throw new Error('This quotation has changed. Refresh and review it before creating a work order.')
      const payload = quotationWorkOrderPayload(values, latest)
      if (!await confirmSave('work order')) return
      const { data } = await quotationService.createWorkOrder(quotation.id, payload)
      message.success(`Work order ${data.number} created successfully.`)
      setOpen(false)
    } catch (err) { setError(err.message) }
    finally { lock.current = false; setSaving(false) }
  }
  if (!allowed) return null
  return <>
    {confirmation}
    <Button variant="text" icon={<ToolOutlined />} title="Create Work Order" aria-label={`Create work order for quotation ${quotation.no ?? ''}`} onClick={() => { form.resetFields(); setError(''); setOpen(true) }} />
    <Modal title="Create Work Order" visible={open} onOk={() => form.submit()} okText="Create Work Order" busy={saving}
      onCancel={saving ? undefined : () => setOpen(false)} closable={!saving} maskClosable={!saving} keyboard={!saving} cancelButtonProps={{ disabled: saving }} unmountOnClose>
      <Form form={form} layout="vertical" initialValues={{ inspectors: [] }} onFinish={save} disabled={saving}>
        <Form.Item label="Quotation"><Input value={quotation.no ?? quotation.id} disabled /></Form.Item>
        <Form.Item label="Status"><Input value="DRAFT" disabled /></Form.Item>
        <Form.Item name="startDate" label="Start Date" rules={[{ required: true, message: 'Start date is required.' }]}><Input type="date" /></Form.Item>
        <Form.Item name="endDate" label="End Date" dependencies={['startDate']} rules={[({ getFieldValue }) => ({ validator: (_, value) => !value || value >= getFieldValue('startDate') ? Promise.resolve() : Promise.reject(new Error('End date must be on or after start date.')) })]}><Input type="date" /></Form.Item>
        <Form.Item name="inspectors" label="Inspectors" extra="Enter a name and press Enter. Maximum 100 unique names."><Select mode="tags" open={false} maxCount={100} placeholder="Enter inspector names" /></Form.Item>
        <Form.Item name="summary" label="Work Summary" rules={[{ required: true, whitespace: true }, { max: 20000 }]}><Input.TextArea rows={4} maxLength={20000} showCount /></Form.Item>
        {error && <div role="alert">{error}</div>}
      </Form>
    </Modal>
  </>
}
