import { useRef, useState } from 'react'
import { App, Button, Form, Input, InputNumber, Space, Typography } from '../../components/global'
import { QUANTITY_PATTERN } from './quotationModel'

export default function QuotationItemDetails({ item, saving, blocked, onBack, onConfirm }) {
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const maintenanceAvailable = item.priceMaintenance != null
  const disabled = saving || blocked || submitting
  const add = async () => {
    if (disabled || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const values = await form.validateFields()
      await onConfirm({ ...item, ...values, quantityMaintenance: maintenanceAvailable ? values.quantityMaintenance : '0' })
    } catch (error) {
      if (!error.errorFields) message.error(error.message || 'Unable to add quotation item.')
    } finally { submittingRef.current = false; setSubmitting(false) }
  }
  const quantityRules = [
    { required: true, message: 'Enter quantity.' },
    { pattern: QUANTITY_PATTERN, message: 'Use 0 to 999999999999.999 with up to 3 decimal places.' },
  ]
  return <div>
    <Typography.Title level={5}>{item.itemName}</Typography.Title>
    <p><Typography.Text tone="secondary">{item.serviceName || 'Standalone'} · {item.size ?? 'Without size'}</Typography.Text></p>
    <Form form={form} component="div" layout="vertical" disabled={disabled} initialValues={{ quantityInspection: item.quantityInspection || '1', quantityMaintenance: '0', note: '' }}>
      <div className="quotation-form-grid">
        <Form.Item name="quantityInspection" label="Inspection Quantity" dependencies={['quantityMaintenance']} rules={[...quantityRules, {
          validator: async (_, value) => {
            if (!(Number(value) > 0 || (maintenanceAvailable && Number(form.getFieldValue('quantityMaintenance')) > 0))) throw new Error('Enter a positive inspection or maintenance quantity.')
          },
        }]}>
          <InputNumber aria-label="New item inspection quantity" stringMode min="0" max="999999999999.999" step="1" />
        </Form.Item>
        {maintenanceAvailable && <Form.Item name="quantityMaintenance" label="Maintenance Quantity" rules={quantityRules}>
          <InputNumber aria-label="New item maintenance quantity" stringMode min="0" max="999999999999.999" step="1" />
        </Form.Item>}
      </div>
      <Form.Item name="note" label="Note (Optional)" rules={[{ max: 5000, message: 'Note must be 5,000 characters or fewer.' }]}>
        <Input.TextArea aria-label="New item note" maxLength={5000} autoSize={{ minRows: 3, maxRows: 6 }} />
      </Form.Item>
      <p><Typography.Text tone="secondary">The item will be saved to this quotation when you click Add Item.</Typography.Text></p>
      <Space><Button disabled={disabled} onClick={onBack}>Back to Items</Button><Button variant="primary" busy={saving || submitting} disabled={blocked} onClick={add}>Add Item</Button></Space>
    </Form>
  </div>
}
