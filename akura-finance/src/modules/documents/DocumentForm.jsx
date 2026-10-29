import { useEffect, useState } from 'react'
import { Alert, Form, Input, Select, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button } from '../../components/FinanceControls'
import { Table } from '../../components/ResponsiveTable'
import { documentOptionService } from '../../services/documentOptionService'
import DocumentItemPicker from './DocumentItemPicker'
import { dateValue, documentDate, documentOptionValues, isValidDate, money, validateDueDate } from './documentModel'

export default function DocumentForm({ form, record, busy, stale, onFinish }) {
  const companyId = Form.useWatch('companyId', form)
  const selectedIds = Form.useWatch('items', form) || []
  const [catalog, setCatalog] = useState({})
  const [picker, setPicker] = useState(false)
  const [companyQuery, setCompanyQuery] = useState({ search: '', page: 1 })
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [companyPages, setCompanyPages] = useState(1)
  const [loading, setLoading] = useState(!record)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (record) return
    let active = true
    setLoading(true); setError('')
    const timer = setTimeout(() => {
      documentOptionService.companies({ ...companyQuery, limit: 20 }).then(response => {
        if (!active) return
        setCompanies(previous => companyQuery.page === 1 ? response.data.companies : [...new Map([...previous, ...response.data.companies].map(company => [company.id, company])).values()])
        setCompanyPages(response.data.pagination.totalPages)
      }).catch(err => { if (active) setError(err.message) })
        .finally(() => { if (active) setLoading(false) })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [record, companyQuery, retry])
  const requiredDueDate = record?.source === 'QUOTATION' || Boolean(record?.quotationId)
  const disabled = busy || stale
  return <Form className="finance-document-form" form={form} layout="vertical" onFinish={onFinish} disabled={disabled} preserve={false} onValuesChange={changed => {
    if (!Object.hasOwn(changed, 'companyId')) return
    form.setFieldValue('items', []); setCatalog({}); setPicker(false)
  }}>
    {error && <Alert type="error" showIcon title="Unable to load companies" description={error} action={<Button disabled={busy} onClick={() => { setLoading(true); setRetry(value => value + 1) }}>Retry</Button>} />}
    <div className="finance-document-form-grid">
      {!record && <Form.Item name="companyId" label="Company" rules={[{ required: true, message: 'Select a company.' }]}>
        <Select showSearch filterOption={false} placeholder="Select company" loading={loading} options={companies.map(company => ({ value: company.id, label: company.name }))}
          onSelect={(value, option) => setSelectedCompany({ id: value, name: option.label })}
          labelRender={({ value, label }) => label || (selectedCompany?.id === value ? selectedCompany.name : value)}
          onSearch={search => { setLoading(true); setCompanies([]); setCompanyQuery({ search: search.trim().slice(0, 100), page: 1 }) }}
          onPopupScroll={event => {
            const target = event.target
            if (!loading && !error && companyQuery.page < companyPages && target.scrollTop + target.clientHeight >= target.scrollHeight - 24) {
              setLoading(true); setCompanyQuery(value => ({ ...value, page: value.page + 1 }))
            }
          }} />
      </Form.Item>}
      <Form.Item name="title" label="Title" className={record ? 'finance-document-full-width' : undefined} rules={[{ required: true, whitespace: true }, { max: 255 }]}><Input maxLength={255} placeholder="Enter document title" /></Form.Item>
      {!record && <>
        <Form.Item name="purchaseOrderNumber" label="Purchase Order Number" rules={[{ required: true, whitespace: true }, { max: 100 }]}><Input maxLength={100} placeholder="Enter purchase order number" /></Form.Item>
        <Form.Item name="purchaseOrderDate" label="Purchase Order Date" rules={[{ required: true }, { validator: (_, value) => isValidDate(value) ? Promise.resolve() : Promise.reject(new Error('Enter a valid purchase order date.')) }]}><Input type="date" /></Form.Item>
        <Form.Item name="location" label="Location" rules={[{ max: 255 }]}><Input maxLength={255} placeholder="Enter location (optional)" /></Form.Item>
      </>}
      <Form.Item name="dueDate" label="Due Date" rules={[{ required: requiredDueDate }, { validator: (_, value) => {
        const error = validateDueDate(value, record ? dateValue(record.date) : documentDate(), requiredDueDate)
        return error ? Promise.reject(new Error(error)) : Promise.resolve()
      } }]}><Input type="date" min={record ? dateValue(record.date) : documentDate()} /></Form.Item>
      <Form.Item name="notes" label="Notes" className="finance-document-full-width" rules={[{ max: 20000 }]}><Input.TextArea rows={3} maxLength={20000} placeholder="Enter notes (optional)" /></Form.Item>
    </div>
    {!record && <Form.List name="items" rules={[{ validator: async (_, items) => {
      if (!items?.length || items.length > 100 || new Set(items).size !== items.length) throw new Error('Select 1-100 unique items.')
    } }]}>{(fields, { add, remove }, { errors }) => <section className="finance-document-lines">
      <div className="finance-document-lines-heading"><Typography.Text strong>Document Items</Typography.Text><Button type="dashed" icon={<PlusOutlined />} disabled={disabled || !companyId || fields.length >= 100} onClick={() => setPicker(true)}>Add Item</Button></div>
      {!companyId && <Typography.Text type="secondary">Select a company to choose items and view prices.</Typography.Text>}
      <Table rowKey="key" dataSource={fields} pagination={false} scroll={{ x: 1040 }} locale={{ emptyText: 'No items selected. Click Add Item to choose an item.' }} columns={[
        { title: 'No.', width: 60, render: (_, field) => field.name + 1 },
        { title: 'Service', width: 180, render: (_, field) => catalog[selectedIds[field.name]]?.serviceName || 'Standalone' },
        { title: 'Item', width: 220, render: (_, { name, key: _key, ...field }) => <><Form.Item {...field} name={name} hidden><Input /></Form.Item><Typography.Text strong>{catalog[selectedIds[name]]?.itemName || '-'}</Typography.Text></> },
        { title: 'Size', width: 120, render: (_, field) => catalog[selectedIds[field.name]]?.size ?? 'Without size' },
        { title: 'Inspection Estimate', width: 180, render: (_, field) => money(catalog[selectedIds[field.name]]?.priceInspection) },
        { title: 'Maintenance Estimate', width: 180, render: (_, field) => money(catalog[selectedIds[field.name]]?.priceMaintenance) },
        { title: 'Action', width: 80, fixed: 'right', render: (_, field) => <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Remove item ${field.name + 1}`} disabled={disabled} onClick={() => remove(field.name)} /> },
      ]} />
      <Form.ErrorList errors={errors} />
      <Typography.Text type="secondary">Each item includes one inspection unit and one maintenance unit when available. Prices, tax and totals are confirmed when saved.</Typography.Text>
      {picker && <DocumentItemPicker key={companyId} companyId={companyId} selectedIds={selectedIds} disabled={disabled} onCancel={() => setPicker(false)} onSelect={row => {
        const current = form.getFieldValue('items') || []
        const option = documentOptionValues(row)
        if (disabled || !companyId || !option || current.includes(row.id) || current.length >= 100) return
        setCatalog(value => ({ ...value, [row.id]: option }))
        add(row.id); setPicker(false)
      }} />}
    </section>}</Form.List>}
    <Typography.Paragraph className="finance-document-help" type="secondary">Document number and date are assigned automatically.</Typography.Paragraph>
    {stale && <Alert type="warning" title="Close and reopen this form before retrying." />}
  </Form>
}
