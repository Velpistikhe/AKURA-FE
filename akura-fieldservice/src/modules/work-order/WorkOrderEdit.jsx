import { useRef, useState } from 'react'
import { App, Button, Form, Input, Modal, Select } from '../../components/global'
import { workOrderService } from '../../services/workOrderService'
import { WORK_ORDER_STATUSES, workOrderFormValues, workOrderUpdatePayload } from './workOrderModel'

export default function WorkOrderEdit({ record, onClose, onSaved, onReload }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const lock = useRef(false)

  const save = async (values) => {
    if (lock.current || conflict) return
    lock.current = true
    setSaving(true)
    setError('')
    try {
      const payload = workOrderUpdatePayload(values, record)
      if (!payload) { message.info('No changes were made.'); return }
      const { data } = await workOrderService.update(record.id, payload)
      message.success('Work order updated successfully.')
      onSaved(data)
    } catch (err) {
      setError(err.message)
      setConflict(err.status === 409)
    } finally {
      lock.current = false
      setSaving(false)
    }
  }

  return <Modal title={`Edit ${record.number}`} visible width={800} onCancel={saving ? undefined : onClose}
    closable={!saving} maskClosable={!saving} keyboard={!saving} busy={saving} okText="Save"
    okButtonProps={{ disabled: conflict }} cancelButtonProps={{ disabled: saving }} onOk={() => form.submit()} unmountOnClose>
    <Form form={form} layout="vertical" initialValues={workOrderFormValues(record)} disabled={saving || conflict} onFinish={save}>
      <div className="work-order-grid">
        <Form.Item name="startDate" label="Start Date" rules={[{ required: true, message: 'Start date is required.' }]}><Input type="date" /></Form.Item>
        <Form.Item name="endDate" label="End Date" dependencies={['startDate']} rules={[({ getFieldValue }) => ({ validator: (_, value) => !value || value >= getFieldValue('startDate') ? Promise.resolve() : Promise.reject(new Error('End date must be on or after start date.')) })]}><Input type="date" /></Form.Item>
        <Form.Item name="status" label="Status" rules={[{ required: true }]}><Select options={WORK_ORDER_STATUSES.map((value) => ({ value, label: value.replaceAll('_', ' ') }))} /></Form.Item>
        <Form.Item name="inspectors" label="Inspectors" extra="Enter a name and press Enter. Maximum 100 unique names."><Select mode="tags" open={false} maxCount={100} placeholder="Enter inspector names" /></Form.Item>
      </div>
      <Form.Item name="summary" label="Work Summary" rules={[{ required: true, whitespace: true, message: 'Work summary is required.' }, { max: 20000 }]}><Input.TextArea rows={5} maxLength={20000} showCount /></Form.Item>
    </Form>
    {error && <div role="alert">{error}</div>}
    {conflict && <div role="alert">This work order has changed or been revoked. Reload before editing again. Unsaved changes will be discarded. <Button onClick={onReload}>Reload Work Order</Button></div>}
  </Modal>
}
