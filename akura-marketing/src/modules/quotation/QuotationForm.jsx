import { useEffect, useRef, useState } from 'react'
import { App, Button, DeleteOutlined, Form, Input, InputNumber, PlusOutlined, Popconfirm, Select, Table, Typography } from '../../components/global'
import QuotationItemPicker from './QuotationItemPicker'
import QuotationSkeleton from './QuotationSkeleton'
import { companyStaffService } from '../../services/companyStaffService'
import { companyService } from '../../services/companyService'
import { INQUIRY_METHODS, TEXT_FIELDS, QUANTITY_PATTERN, displayEnum, loadAll, money, quotationFormValues, quotationTextMaxLength } from './quotationModel'

const options = (values) => values.map((value) => ({ value, label: displayEnum(value) }))

export default function QuotationForm({ form, record, saving, blocked = false, onFinish, onLoadingChange, onAddItem, onRemoveItem }) {
  const { message } = App.useApp()
  const [staffs, setStaffs] = useState([])
  const [companies, setCompanies] = useState([])
  const currentItems = Form.useWatch('items', form) || []
  const companyId = Form.useWatch('companyId', form)
  const [picker, setPicker] = useState(null)
  const openPicker = ({ add }) => setPicker({
    add,
    selectedSizeIds: (form.getFieldValue('items') || []).map((item) => item.itemSizeId),
    closing: false,
  })
  const closePicker = () => setPicker((current) => current ? { ...current, closing: true } : null)
  const [loading, setLoading] = useState(true)
  const [optionError, setOptionError] = useState(false)
  const [retry, setRetry] = useState(0)
  const initialized = useRef(false)
  useEffect(() => {
    if (!loading && !optionError) {
      const values = quotationFormValues(record)
      form.setFieldsValue(initialized.current ? { items: values.items } : values)
      initialized.current = true
    }
  }, [form, record, loading, optionError])
  useEffect(() => { onLoadingChange?.(loading || optionError) }, [loading, optionError, onLoadingChange])
  useEffect(() => {
    let active = true
    setLoading(true)
    setOptionError(false)
    Promise.all([loadAll(companyService.list, 'companies'), loadAll(companyStaffService.list, 'staffs')])
      .then(([companies, contacts]) => { if (active) { setCompanies(companies); setStaffs(contacts) } })
      .catch((error) => { if (active) { setOptionError(true); message.error(error.message) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [message, retry])
  const contacts = staffs.filter((staff) => staff.isActive !== false && (staff.companyId || staff.company?.id) === companyId).map((staff) => ({ value: staff.id, label: staff.name }))
  if (record?.staffId && companyId === record.companySnapshot?.id && !contacts.some((staff) => staff.value === record.staffId)) contacts.push({ value: record.staffId, label: record.customerSnapshot, disabled: true })
  const companyOptions = companies.map((company) => ({ value: company.id, label: company.name }))
  if (record?.companySnapshot?.id && !companyOptions.some((company) => company.value === record.companySnapshot.id)) companyOptions.push({ value: record.companySnapshot.id, label: record.companySnapshot.name })
  return (
    <Form className="quotation-content-ready" form={form} layout="vertical" initialValues={quotationFormValues(record)} clearOnDestroy preserve disabled={saving || blocked || loading || optionError} onFinish={onFinish} onValuesChange={(changed) => {
      if (!Object.hasOwn(changed, 'companyId')) return
      form.setFieldValue('staffId', null)
      closePicker()
      if (form.getFieldValue('items')?.length) {
        form.setFieldValue('items', form.getFieldValue('items').map((item) => ({ ...item, priceInspection: undefined, priceMaintenance: undefined })))
        message.warning('Company changed. Item prices will be recalculated when you save.')
      }
    }}>
      {loading ? <QuotationSkeleton /> : optionError ? <div className="quotation-load-error" role="alert">
        <Typography.Text>Unable to load companies and contacts.</Typography.Text>
        <Button disabled={false} onClick={() => { setLoading(true); setRetry((value) => value + 1) }}>Retry</Button>
      </div> : <>
      <div className="quotation-form-grid">
        <Form.Item name="companyId" label="Company" rules={[{ required: true, message: 'Company is required.' }]}>
          <Select showSearch optionFilterProp="label" placeholder="Select company" disabled={Boolean(record) || saving} loading={loading} options={companyOptions} />
        </Form.Item>
        <Form.Item name="staffId" label="Customer Contact" rules={[{ required: true, message: 'Customer contact is required.' }]}>
          <Select showSearch optionFilterProp="label" placeholder="Select contact" disabled={saving || !companyId} loading={loading} options={contacts} />
        </Form.Item>
        <Form.Item label="Tax (%)"><Typography.Text>{record ? `${record.tax ?? '-'}%` : 'Determined automatically from branch tax configuration when saved.'}</Typography.Text></Form.Item>
        <Form.Item name="inquiryMethod" label="Inquiry Method" rules={[{ required: true }]}><Select options={options(INQUIRY_METHODS)} /></Form.Item>
        <Form.Item name="inquiryDate" label="Inquiry Date" rules={[{ required: true, message: 'Inquiry date is required.' }]}><Input type="date" /></Form.Item>
        {TEXT_FIELDS.filter(([key]) => key !== 'jobStart').flatMap((field) => field[0] === 'accomplished' ? [['jobStart', 'Job Start'], field] : [field]).map(([key, label]) => (
          <Form.Item key={key} name={key} label={label} className={key === 'subject' ? 'quotation-form-full-width' : key === 'jobStart' ? 'quotation-form-row-start' : undefined} rules={[
            { required: true, whitespace: true, message: `${label} is required.` },
            { max: quotationTextMaxLength(key) },
          ]}>
            {['supplyAkura', 'supplyCustomer'].includes(key)
              ? <Input.TextArea maxLength={quotationTextMaxLength(key)} autoSize={{ minRows: 3, maxRows: 6 }} />
              : <Input maxLength={quotationTextMaxLength(key)} placeholder={key === 'jobStart' ? 'e.g. Within 7 days after purchase order approval' : undefined} />}
          </Form.Item>
        ))}
      </div>
      <Form.List name="items" rules={[{ validator: async (_, items) => {
        if (record) return
        if (!items?.length || items.length > 100) throw new Error('Add between 1 and 100 quotation items.')
        if (items.some((item) => !(Number(item.quantityInspection) > 0 || Number(item.quantityMaintenance) > 0))) throw new Error('Each item needs a positive inspection or maintenance quantity.')
      } }]}>
        {(fields, { add, remove }, { errors }) => (
          <div className="quotation-lines">
            <div className="quotation-lines-heading"><Typography.Text strong>Quotation Items</Typography.Text>
              <Button variant="dashed" icon={<PlusOutlined />} disabled={saving || blocked || loading || !companyId || fields.length >= 100} onClick={() => openPicker({ add })}>Add Item</Button>
            </div>
            {!companyId && <Typography.Text tone="secondary">Select a company to load item prices.</Typography.Text>}
            <Table
              className="quotation-items-table"
              rowKey="key"
              dataSource={fields}
              pagination={false}
              scroll={{ x: 1700 }}
              locale={{ emptyText: 'No quotation items yet. Click Add Item to select an item size.' }}
              columns={[
                { title: 'No.', width: 60, render: (_, field) => field.name + 1 },
                { title: 'Service', width: 190, render: (_, field) => form.getFieldValue(['items', field.name, 'serviceName']) || 'Standalone' },
                { title: 'Item', width: 230, render: (_, { name, key: _key, ...rest }) => <div className="quotation-selected-item">
                  {['id', 'version', 'itemSizeId', 'itemName', 'serviceName', 'serviceType', 'size', 'priceInspection', 'priceMaintenance'].map((property) => <Form.Item {...rest} key={property} name={[name, property]} hidden><Input /></Form.Item>)}
                  <Typography.Text strong>{form.getFieldValue(['items', name, 'itemName']) || '-'}</Typography.Text>
                </div> },
                { title: 'Size', width: 120, render: (_, field) => form.getFieldValue(['items', field.name, 'size']) ?? 'Without size' },
                { title: 'Note (Optional)', width: 260, render: (_, { name, key: _key, ...rest }) => (
                  <Form.Item {...rest} name={[name, 'note']} style={{ marginBottom: 0 }} rules={[{ max: 5000, message: 'Note must be 5,000 characters or fewer.' }]}>
                    <Input.TextArea disabled={Boolean(record) || saving} aria-label={`Note item ${name + 1}`} placeholder="Enter item note" maxLength={5000} autoSize={{ minRows: 2, maxRows: 6 }} />
                  </Form.Item>
                ) },
                ...[['quantityInspection', 'Inspection Quantity', 'priceInspection'], ['quantityMaintenance', 'Maintenance Quantity', 'priceMaintenance']].map(([property, label, price]) => ({
                  title: label, width: 180, render: (_, { name, key: _key, ...rest }) => <Form.Item {...rest} name={[name, property]} rules={[
                    { required: true, message: 'Enter quantity.' },
                    { pattern: QUANTITY_PATTERN, message: 'Use 0 to 999999999999.999 with up to 3 decimal places.' },
                    { validator: async (_, value) => {
                      if (Number(value) > 0 && currentItems[name]?.[price] === null) throw new Error('This price is unavailable. Use zero quantity.')
                    } },
                  ]}>
                    <InputNumber aria-label={`${label} item ${name + 1}`} disabled={Boolean(record) || saving || currentItems[name]?.[price] === null} stringMode min="0" max="999999999999.999" step="1" />
                  </Form.Item>,
                })),
                ...[['priceInspection', 'quantityInspection', 'Inspection Estimate'], ['priceMaintenance', 'quantityMaintenance', 'Maintenance Estimate']].map(([property, quantityProperty, label]) => ({
                  title: label, width: 180, render: (_, field) => {
                    const item = currentItems[field.name] || {}
                    const amount = item[property]
                    const quantity = item[quantityProperty]
                    if (quantity == null || quantity === '' || !Number.isFinite(Number(quantity)) || Number(quantity) < 0) return money(null)
                    if (Number(quantity) === 0) return money(0)
                    return amount === undefined ? <Typography.Text tone="secondary">Calculated on save</Typography.Text> : money(amount == null ? null : Number(amount) * Number(quantity))
                  },
                })),
                { title: 'Action', width: 85, fixed: 'right', render: (_, field) => record
                  ? <Popconfirm title="Delete quotation item?" description="This item will be deleted immediately." okText="Delete" cancelText="Cancel" onConfirm={() => onRemoveItem?.(form.getFieldValue(['items', field.name]))}>
                    <Button variant="text" isDanger icon={<DeleteOutlined />} aria-label={`Remove item ${field.name + 1}`} disabled={saving || blocked || !onRemoveItem} />
                  </Popconfirm>
                  : <Button variant="text" isDanger icon={<DeleteOutlined />} aria-label={`Remove item ${field.name + 1}`} disabled={saving} onClick={() => remove(field.name)} /> },
              ]}
            />
            {picker && <QuotationItemPicker key={companyId} companyId={companyId} visible={!picker.closing} saving={saving} blocked={blocked} selectedSizeIds={picker.selectedSizeIds} onCancel={closePicker}
              afterClose={() => setPicker((current) => current?.closing ? null : current)} onSelect={async (selected) => {
              if (picker.closing || !companyId || !selected) return
              if ((form.getFieldValue('items') || []).some((item) => item.itemSizeId === selected.itemSizeId)) {
                message.warning('This item size has already been selected.')
                return
              }
              if (record) {
                if (!await onAddItem?.(selected)) return
              } else picker.add(selected)
              closePicker()
            }} />}
            <Form.ErrorList errors={errors} />
            <Typography.Text tone="secondary">{record ? 'Adding or deleting an item saves immediately. Save applies changes to quotation information and customer contact. Company is fixed.' : 'Final prices and totals are calculated after saving. To change an existing catalog item, remove its line and add a new one.'}</Typography.Text>
          </div>
        )}
      </Form.List>
      </>}
    </Form>
  )
}
