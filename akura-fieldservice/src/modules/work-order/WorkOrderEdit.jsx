import { useRef, useState } from 'react'
import { App, Button, Form, Input, Modal, Select } from '../../components/global'
import { workOrderService } from '../../services/workOrderService'
import { WORK_ORDER_PATCH_STATUSES, workOrderFormValues, workOrderUpdatePayload } from './workOrderModel'

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
        <Form.Item name="status" label="Status" rules={[{ required: true }]}><Select options={[
          ...WORK_ORDER_PATCH_STATUSES.map((value) => ({ value, label: value.replaceAll('_', ' ') })),
          // An IN_PROGRESS work order cannot keep that status through PATCH, but
          // the stored value stays visible so the current state is never hidden.
          ...(record.status === 'IN_PROGRESS' ? [{ value: 'IN_PROGRESS', label: 'IN PROGRESS (set by the start action)', disabled: true }] : []),
        ]} /></Form.Item>
        <Form.Item name="inspectors" label="Inspectors" extra="Enter a name and press Enter. Maximum 100 unique names."><Select mode="tags" open={false} maxCount={100} placeholder="Enter inspector names" /></Form.Item>
      </div>
    </Form>
    {error && <div role="alert">{error}</div>}
    {conflict && <div role="alert">This work order has changed or been revoked. Reload before editing again. Unsaved changes will be discarded. <Button onClick={onReload}>Reload Work Order</Button></div>}
  </Modal>
}
