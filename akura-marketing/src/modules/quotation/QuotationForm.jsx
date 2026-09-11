import { useEffect, useState } from 'react'
import { App, Button, DeleteOutlined, Form, Input, InputNumber, PlusOutlined, Select, Table, Typography } from '../../components/global'
import QuotationItemPicker from './QuotationItemPicker'
import { companyStaffService } from '../../services/companyStaffService'
import { INQUIRY_METHODS, INVOICE_STATUSES, STATUSES, TEXT_FIELDS, PRICE_PATTERN, QUANTITY_PATTERN, displayEnum, loadAll, quotationFormValues } from './quotationModel'

const options = (values) => values.map((value) => ({ value, label: displayEnum(value) }))

export default function QuotationForm({ form, record, saving, onFinish }) {
  const { message } = App.useApp()
  const [staffs, setStaffs] = useState([])
  const selectedStaffId = Form.useWatch('staffId', form)
  const selectedStaff = staffs.find((staff) => staff.id === selectedStaffId)
  const companyId = selectedStaff?.companyId || selectedStaff?.company?.id
  const [picker, setPicker] = useState(null)
  const openPicker = (target) => setPicker({
    ...target,
    selectedSizeIds: (form.getFieldValue('items') || []).map((item) => item.itemSizeId),
    closing: false,
  })
  const closePicker = () => setPicker((current) => current ? { ...current, closing: true } : null)
  const [loading, setLoading] = useState(true)
  const [optionError, setOptionError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setOptionError(false)
    loadAll(companyStaffService.list, 'staffs')
      .then((contacts) => { if (active) setStaffs(contacts) })
      .catch((error) => { if (active) { setOptionError(true); message.error(error.message) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [message, retry])
  const contacts = staffs.map((staff) => ({ value: staff.id, label: `${staff.company?.name || '-'} / ${staff.name}` }))
  if (record && !contacts.some((staff) => staff.value === record.staffId)) contacts.push({ value: record.staffId, label: record.customerSnapshot })
  return (
    <Form form={form} layout="vertical" initialValues={quotationFormValues(record)} clearOnDestroy preserve disabled={saving} onFinish={onFinish} onValuesChange={(changed) => {
      if (!Object.hasOwn(changed, 'staffId')) return
      closePicker()
      const nextStaff = staffs.find((staff) => staff.id === changed.staffId)
      const nextCompanyId = nextStaff?.companyId || nextStaff?.company?.id
      if (companyId && nextCompanyId !== companyId && form.getFieldValue('items')?.length) {
        form.setFieldValue('items', form.getFieldValue('items').map((item) => ({ ...item, unitPrice: undefined })))
        message.warning('Customer company changed. Review and enter the item prices for this company before saving.')
      }
    }}>
      {optionError && <Button onClick={() => setRetry((value) => value + 1)}>Retry loading contacts</Button>}
      <div className="quotation-form-grid">
        <Form.Item name="staffId" label="Customer Contact" rules={[{ required: true, message: 'Customer contact is required.' }]}>
          <Select showSearch optionFilterProp="label" placeholder="Select company / staff" loading={loading} options={contacts} />
        </Form.Item>
        <Form.Item name="date" label="Quotation Date"><Input type="date" /></Form.Item>
        <Form.Item name="inquiryMethod" label="Inquiry Method" rules={[{ required: true }]}><Select options={options(INQUIRY_METHODS)} /></Form.Item>
        <Form.Item name="inquiryDate" label="Inquiry Date" rules={[{ required: true, message: 'Inquiry date is required.' }]}><Input type="date" /></Form.Item>
        {TEXT_FIELDS.map(([key, label]) => (
          <Form.Item key={key} name={key} label={label} rules={[{ required: true, whitespace: true, message: `${label} is required.` }, { max: 255 }]}>
            <Input maxLength={255} />
          </Form.Item>
        ))}
        <Form.Item name="tax" label="Tax (%)" rules={[{ required: true }, { type: 'integer', min: 0, max: 100 }]}><InputNumber min={0} max={100} precision={0} /></Form.Item>
        <Form.Item name="status" label="Status" rules={[{ required: true }]}><Select options={options(STATUSES)} /></Form.Item>
        <Form.Item name="invoiceStatus" label="Invoice Status"><Select allowClear placeholder="No invoice" options={options(INVOICE_STATUSES)} /></Form.Item>
      </div>
      <Form.List name="items" rules={[{ validator: async (_, items) => {
        if (!items?.length || items.length > 100) throw new Error('Add between 1 and 100 quotation items.')
      } }]}>
        {(fields, { add, remove }, { errors }) => (
          <div className="quotation-lines">
            <div className="quotation-lines-heading"><Typography.Text strong>Quotation Items</Typography.Text>
              <Button variant="dashed" icon={<PlusOutlined />} disabled={saving || loading || !companyId || fields.length >= 100} onClick={() => openPicker({ add })}>Add Item</Button>
            </div>
            {!companyId && <Typography.Text tone="secondary">Select a customer contact to load company item prices.</Typography.Text>}
            <Table
              className="quotation-items-table"
              rowKey="key"
              dataSource={fields}
              pagination={false}
              scroll={{ x: 1100 }}
              locale={{ emptyText: 'No quotation items yet. Click Add Item to select an item size.' }}
              columns={[
                { title: 'No.', width: 60, render: (_, field) => field.name + 1 },
                { title: 'Service', width: 190, render: (_, field) => form.getFieldValue(['items', field.name, 'serviceName']) || '-' },
                { title: 'Type', width: 120, render: (_, field) => displayEnum(form.getFieldValue(['items', field.name, 'serviceType'])) },
                { title: 'Item', width: 230, render: (_, { name, key: _key, ...rest }) => <div className="quotation-selected-item">
                  {['id', 'itemSizeId', 'catalogLabel', 'itemName', 'serviceName', 'serviceType', 'size'].map((property) => <Form.Item {...rest} key={property} name={[name, property]} hidden><Input /></Form.Item>)}
                  <Typography.Text strong>{form.getFieldValue(['items', name, 'itemName']) || '-'}</Typography.Text>
                  {!form.getFieldValue(['items', name, 'id']) && <Button variant="link" disabled={saving || !companyId} onClick={() => openPicker({ name })}>Change Item</Button>}
                </div> },
                { title: 'Size', width: 120, render: (_, field) => form.getFieldValue(['items', field.name, 'size']) || '-' },
                { title: 'Quantity', width: 160, render: (_, { name, key: _key, ...rest }) => <Form.Item {...rest} name={[name, 'quantity']} rules={[{ required: true, message: 'Enter quantity.' }, { pattern: QUANTITY_PATTERN, message: 'Use a positive quantity, up to 12 integer digits and 3 decimals.' }]}>
                  <InputNumber aria-label={`Quantity item ${name + 1}`} stringMode min="0.001" step="0.001" />
                </Form.Item> },
                { title: 'Unit Price', width: 180, render: (_, { name, key: _key, ...rest }) => <Form.Item {...rest} name={[name, 'unitPrice']} rules={[{ required: true, message: 'Enter unit price.' }, { pattern: PRICE_PATTERN, message: 'Use a nonnegative price, up to 12 integer digits and 2 decimals.' }]}>
                  <InputNumber aria-label={`Unit price item ${name + 1}`} stringMode min="0" step="0.01" />
                </Form.Item> },
                { title: 'Action', width: 85, fixed: 'right', render: (_, field) => <Button variant="text" isDanger icon={<DeleteOutlined />} aria-label={`Remove item ${field.name + 1}`} disabled={saving} onClick={() => remove(field.name)} /> },
              ]}
            />
            {picker && <QuotationItemPicker key={companyId} companyId={companyId} visible={!picker.closing} selectedSizeIds={picker.selectedSizeIds} onCancel={closePicker}
              afterClose={() => setPicker((current) => current?.closing ? null : current)} onSelect={(size) => {
              if (picker.closing || !companyId || size.priceStatus !== 'AVAILABLE' || size.priceService == null) return
              if ((form.getFieldValue('items') || []).some((item) => item.itemSizeId === size.id)) {
                message.warning('This item size has already been selected.')
                return
              }
              const selected = { itemSizeId: size.id, itemName: size.item.name, serviceName: size.item.service.name, serviceType: size.item.service.type, size: size.size, catalogLabel: `${size.size} - ${size.item.name} / ${size.item.service.name}` }
              if (picker.add) picker.add({ ...selected, quantity: '1', unitPrice: String(size.priceService) })
              else {
                Object.entries({ ...selected, unitPrice: String(size.priceService) }).forEach(([property, value]) => form.setFieldValue(['items', picker.name, property], value))
              }
              closePicker()
            }} />}
            <Form.ErrorList errors={errors} />
            <Typography.Text tone="secondary">Totals are calculated after saving. To change an existing catalog item, remove its line and add a new one.</Typography.Text>
          </div>
        )}
      </Form.List>
    </Form>
  )
}
