import { useEffect, useRef, useState } from 'react'
import { App, Button, Card, Form, Input, Result, Select, Space, Typography, useSaveConfirmation } from '../../components/global'
import { companyService } from '../../services/companyService'
import { quotationService } from '../../services/quotationService'
import { workOrderService } from '../../services/workOrderService'
import { loadAll, displayEnum } from '../quotation/quotationModel'
import { canAccessWorkOrders, WORK_ORDER_STATUSES, workOrderPayload } from './workOrderModel'
import '../company/CompanyPage.css'
import './WorkOrderPage.css'

export default function WorkOrderCreatePage({ currentUser, onBack }) {
  if (!canAccessWorkOrders(currentUser)) return <Result status="403" title="Access denied" subTitle="Work orders require an active ADMIN, APP_MANAGER, or Field Service user with an assigned branch." />
  return <CreateForm onBack={onBack} />
}

function CreateForm({ onBack }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const basis = Form.useWatch('basis', form) || 'quotation'
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const [confirmSave, confirmation] = useSaveConfirmation()
  useEffect(() => {
    let active = true
    setLoading(true)
    setOptions([])
    setError('')
    const request = basis === 'company' ? loadAll(companyService.list, 'companies') : loadAll(quotationService.list, 'quotations')
    request.then((rows) => {
      if (active) setOptions(rows.filter((row) => basis === 'company' || (row.status === 'APPROVED' && row.isActive !== false))
        .map((row) => ({ value: row.id, label: basis === 'company' ? row.name : `${row.no || row.id} — ${row.companySnapshot?.name || row.subject || ''}` })))
    }).catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [basis, retry])

  const save = async (values) => {
    if (lock.current || loading || error) return
    lock.current = true
    setSaving(true)
    try {
      const quotation = values.basis === 'quotation' ? (await quotationService.get(values.quotationId)).data : null
      const payload = workOrderPayload(values, quotation)
      if (!await confirmSave('work order')) return
      await workOrderService.create(payload)
      message.success('Work order created successfully.')
      onBack()
    } catch (err) { message.error(err.message) }
    finally { lock.current = false; setSaving(false) }
  }

  return <section className="company-page work-order-page">
    {confirmation}
    <div className="company-page-heading">
      <div><Typography.Title level={2}>Create Work Order</Typography.Title><Typography.Text tone="secondary">Plan the work and assign inspectors. Number and date are generated automatically.</Typography.Text></div>
      <Space><Button disabled={saving} onClick={onBack}>Cancel</Button><Button variant="primary" busy={saving} disabled={loading || Boolean(error)} onClick={() => form.submit()}>Save Work Order</Button></Space>
    </div>
    <Card><Form form={form} layout="vertical" initialValues={{ basis: 'quotation', status: 'DRAFT', inspectors: [] }} disabled={saving} onFinish={save}
      onValuesChange={(changed) => { if (Object.hasOwn(changed, 'basis')) form.setFieldsValue({ quotationId: undefined, companyId: undefined }) }}>
      <div className="work-order-grid">
        <Form.Item name="basis" label="Document Basis" rules={[{ required: true }]}><Select options={[{ value: 'quotation', label: 'Approved Quotation' }, { value: 'company', label: 'Company Contract' }]} /></Form.Item>
        <Form.Item key={basis} name={basis === 'company' ? 'companyId' : 'quotationId'} label={basis === 'company' ? 'Company' : 'Quotation'} rules={[{ required: true, message: 'Select a document basis.' }]}
          extra={basis === 'company' ? 'The company must have exactly one active contract within its effective period.' : 'Only approved quotations with standard or sister company prices can be used.'}>
          <Select showSearch optionFilterProp="label" loading={loading} disabled={saving || loading || Boolean(error)} options={options} placeholder={basis === 'company' ? 'Select company' : 'Select quotation'} />
        </Form.Item>
        <Form.Item name="startDate" label="Start Date" rules={[{ required: true, message: 'Start date is required.' }]}><Input type="date" /></Form.Item>
        <Form.Item name="endDate" label="End Date" dependencies={['startDate']} rules={[({ getFieldValue }) => ({ validator: (_, value) => !value || value >= getFieldValue('startDate') ? Promise.resolve() : Promise.reject(new Error('End date must be on or after start date.')) })]}><Input type="date" /></Form.Item>
        <Form.Item name="status" label="Status" rules={[{ required: true }]}><Select options={WORK_ORDER_STATUSES.map((value) => ({ value, label: displayEnum(value) }))} /></Form.Item>
        <Form.Item name="inspectors" label="Inspectors" extra="Enter a name and press Enter. Maximum 100 unique names."><Select mode="tags" open={false} maxCount={100} placeholder="Enter inspector names" /></Form.Item>
      </div>
      <Form.Item name="summary" label="Work Summary" rules={[{ required: true, whitespace: true, message: 'Work summary is required.' }, { max: 20000 }]}><Input.TextArea rows={5} maxLength={20000} showCount /></Form.Item>
      {error && <div role="alert">{error} <Button disabled={saving} onClick={() => setRetry((value) => value + 1)}>Retry loading options</Button></div>}
    </Form></Card>
  </section>
}
