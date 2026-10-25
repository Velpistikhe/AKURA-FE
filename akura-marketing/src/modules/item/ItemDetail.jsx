import { useEffect, useRef, useState } from 'react'
import {
  App, Button, DeleteOutlined, EditOutlined, EyeOutlined, Form, HistoryOutlined, Input, PriceInput,
  Modal, PlusOutlined, Popconfirm, Space, Table, TableSearchFilter, Tag, Typography, useSaveConfirmation,
} from '../../components/global'
import { itemService } from '../../services/itemService'
import ItemHistory from './ItemHistory'
import { decimalPrice } from '../../components/global/priceFormat'

const priceFields = [
  ['priceServicePrimary', 'Primary Service'],
  ['priceServiceSisterCompany', 'Sister Service'],
  ['priceMaintenancePrimary', 'Primary Maintenance'],
  ['priceMaintenanceSisterCompany', 'Sister Maintenance'],
]
const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 })
const formatPrice = (value) => value == null ? '-' : currency.format(value)
const sizeRules = [{ required: true, whitespace: true, message: 'Size is required.' }, { max: 100 }]
const optionalPriceRule = { validator: async (_, value) => {
  if (value == null || value === '') return
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(String(value))) throw new Error('Enter a price with up to 16 digits and two decimal places.')
} }
const priceRule = { validator: async (_, value) => {
  if (value == null || value === '') throw new Error('Price is required.')
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(String(value))) throw new Error('Enter a price with up to 16 digits and two decimal places.')
} }

export default function ItemDetail({ item, visible, onClose, afterClose, onUpdate, onChange, onDetailChange }) {
  const { message } = App.useApp()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [sizeForm] = Form.useForm()
  const [sizeFormOpen, setSizeFormOpen] = useState(false)
  const [scopeForm] = Form.useForm()
  const [scopeSaving, setScopeSaving] = useState(false)
  const [scopeFormOpen, setScopeFormOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [query, setQuery] = useState({ page: 1, limit: 20, size: '', sortBy: '', sortOrder: '' })
  const [data, setData] = useState({ sizes: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState('')
  const [history, setHistory] = useState(null)
  const [sizeEligibility, setSizeEligibility] = useState(null)
  const lock = useRef(false)
  const readOnly = item?.isActive === false
  const editorReadOnly = readOnly || editor?.size.isActive === false || editor?.size.item?.isActive === false || editor?.price?.isActive === false
  const itemId = item?.id
  const canAddSize = Boolean(itemId) && !readOnly
    && !loading && !error
    && sizeEligibility?.itemId === itemId && sizeEligibility?.allowed === true
  const canAddNoSize = canAddSize && sizeEligibility?.empty === true
  // Scopes are only owned by standalone items, and the scope endpoint is inspection-only.
  const canAddScope = Boolean(itemId) && !readOnly && !item?.serviceId && !item?.service

  useEffect(() => {
    if (!editor || editorReadOnly) return
    // Reset explicitly on each open; preserve values during StrictMode's simulated unmount.
    editForm.resetFields()
    editForm.setFieldsValue(Object.fromEntries(
      priceFields.map(([key]) => [key, decimalPrice(editor.price?.[key])]),
    ))
  }, [editor, editorReadOnly, editForm])

  useEffect(() => {
    if (!itemId || !visible) return
    let active = true
    setLoading(true)
    setError('')
    const timeout = setTimeout(async () => {
      try {
        const response = await itemService.listSizes({ itemId, ...query })
        if (!active) return
        const result = response.data
        // Reuse the table response; the backend prohibits mixing size modes.
        // An empty search result does not change the last known mode.
        if (result.sizes.length || !query.size) {
          setSizeEligibility({ itemId, allowed: !result.sizes.some(({ size }) => size === null),
            empty: !query.size && query.page === 1 && result.pagination.total === 0 && result.sizes.length === 0 })
        }
        if (!result.sizes.length && query.page > 1) {
          setQuery((current) => ({ ...current, page: Math.max(1, result.pagination.totalPages || 1) }))
        } else setData(result)
      } catch (err) {
        if (active) { setError(err.message); setData({ sizes: [], pagination: { total: 0 } }) }
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => { active = false; clearTimeout(timeout) }
  }, [itemId, visible, query, refresh])

  const refreshDetail = async () => {
    setRefresh((value) => value + 1)
    onChange()
    try {
      const response = await itemService.get(itemId)
      onDetailChange(response.data)
    } catch (err) {
      message.error(err.message)
      if (err.status === 404) onClose()
    }
  }

  const mutate = async (key, action, success, after) => {
    if (readOnly || lock.current) return
    lock.current = true
    setBusy(key)
    try {
      await action()
      message.success(success)
      after?.()
      await refreshDetail()
    } catch (err) {
      message.error(err.message)
      if (err.status === 409) {
        setEditor(null)
        message.warning('Data has changed or a duplicate already exists. Review the refreshed data before trying again.')
        await refreshDetail()
      }
    } finally {
      lock.current = false
      setBusy('')
    }
  }

  const addSize = async (values) => {
    if (!canAddSize || lock.current || !await confirmSave('item size')) return
    await mutate('add', () => {
      const payload = { itemId, itemVersion: item.version, size: values.size.trim() }
      const suppliedPrices = priceFields.filter(([key]) => values[key] != null && values[key] !== '')
      if (suppliedPrices.length) {
        for (const [key] of priceFields.slice(0, 2)) {
          if (values[key] == null || values[key] === '') throw new Error('Primary and sister service prices are both required when adding prices.')
        }
        if (item.service?.hasMaintenance && priceFields.slice(2).some(([key]) => values[key] == null || values[key] === '')) {
          throw new Error('Both maintenance prices are required for this service.')
        }
        for (const [key] of suppliedPrices) payload[key] = String(values[key])
      }
      return itemService.addSize(payload)
    }, 'Item size added successfully.', () => {
      sizeForm.resetFields()
      setSizeFormOpen(false)
    })
  }

  const addNoSize = async () => {
    if (!canAddNoSize || lock.current || !await confirmSave('item without size')) return
    await mutate('add-no-size', () => itemService.addSize({ itemId, itemVersion: item.version, size: null }),
      'Item without size added successfully.', () => {
        sizeForm.resetFields()
        setSizeFormOpen(false)
        setSizeEligibility({ itemId, allowed: false, empty: false })
        setQuery((current) => ({ ...current, page: 1, size: '' }))
      })
  }

  const cancelSizeForm = () => {
    sizeForm.resetFields()
    setSizeFormOpen(false)
  }

  const saveScopes = async (values) => {
    if (!canAddScope || lock.current) return
    const label = values.inspectionScope.trim()
    if (!label) return
    // The endpoint skips active duplicates and reactivates matching revoked scopes.
    if (!await confirmSave('inspection scope')) return
    setScopeSaving(true)
    try {
      await itemService.addScopes(itemId, [label])
      message.success('Inspection scope added successfully.')
      scopeForm.resetFields()
      setScopeFormOpen(false)
      await refreshDetail()
    } catch (err) {
      message.error(err.message)
      if (err.status === 409) await refreshDetail()
    } finally {
      setScopeSaving(false)
    }
  }

  const openEditor = async (row) => {
    if (lock.current) return
    lock.current = true
    setBusy(row.id)
    try {
      const response = await itemService.getSize(row.id)
      if (!response.data?.id) throw new Error('Invalid size detail data.')
      setEditor({ size: response.data, price: response.data.price })
    } catch (err) {
      message.error(err.message)
    } finally {
      lock.current = false
      setBusy('')
    }
  }

  const save = async (values) => {
    if (editorReadOnly || lock.current) return
    const { size, price } = editor
    const hasMaintenance = Boolean(size.item?.service?.hasMaintenance ?? item.service?.hasMaintenance)
    if (!await confirmSave('standard price')) return
    await mutate('save', () => {
      const payload = Object.fromEntries(priceFields.map(([key], index) => [key, index > 1 && !hasMaintenance ? null : String(values[key])]))
      return price
        ? itemService.updatePrice(size.id, { ...payload, version: price.version })
        : itemService.createPrice(size.id, payload)
    }, 'Standard price saved successfully.', () => setEditor(null))
  }

  if (!item) return null
  const hasMaintenance = Boolean(item.service?.hasMaintenance)
  const visiblePrices = priceFields.filter((_, index) => index < 2 || hasMaintenance)
  const editorHasMaintenance = Boolean(editor?.size.item?.service?.hasMaintenance ?? item.service?.hasMaintenance)

  return <>
    {saveConfirmation}
    <Modal title={`Item Detail: ${item.name}`} visible={visible} width={1180} onCancel={onClose} afterClose={afterClose}
      closable={!busy} keyboard={!busy} mask={{ closable: !busy }}
      footer={<Space><Button disabled={Boolean(busy)} onClick={onClose}>Close</Button>
        {!readOnly && <Button variant="primary" icon={<EditOutlined />} disabled={Boolean(busy)} onClick={() => onUpdate(item)}>Update Item</Button>}
      </Space>} unmountOnClose>
      <div className="item-detail">
        <section className="company-view-section">
          <div className="company-view-section-heading"><h3>Item Profile</h3></div>
          <dl className="company-detail-grid">
            <div><dt>Service</dt><dd>{item.service?.name || '-'}</dd></div>
            <div><dt>Name</dt><dd>{item.name}</dd></div>
            <div><dt>UOM</dt><dd>{item.uom || '-'}</dd></div>
            <div><dt>Status</dt><dd><Tag color={item.isActive ? 'success' : 'default'}>{item.isActive ? 'Active' : 'Inactive'}</Tag></dd></div>
            <div><dt>Maintenance</dt><dd>{hasMaintenance ? 'Yes' : 'No'}</dd></div>
            <div><dt>Created By</dt><dd>{item.createdByName || '-'}</dd></div>
            <div><dt>Updated By</dt><dd>{item.updatedByName || '-'}</dd></div>
          </dl>
        </section>
        {!item.serviceId && !item.service && <section className="company-view-section">
          <div className="company-view-section-heading">
            <h3>Inspection Scopes</h3>
            {canAddScope && !scopeFormOpen && <Button variant="dashed" icon={<PlusOutlined />}
              onClick={() => setScopeFormOpen(true)}>Add Inspection scope</Button>}
          </div>
          {canAddScope && scopeFormOpen && <Form form={scopeForm} className="item-scope-form" layout="vertical" preserve={false} clearOnDestroy onFinish={saveScopes} disabled={scopeSaving}>
            <Form.Item name="inspectionScope" rules={[{ required: true, whitespace: true, message: 'Inspection scope is required.' }, { max: 500, message: 'Maximum length is 500 characters.' }]}>
              <Input maxLength={500} placeholder="Enter a new inspection scope" aria-label="New inspection scope" />
            </Form.Item>
            <Button variant="primary" icon={<PlusOutlined />} htmlType="submit" busy={scopeSaving}>Add</Button>
          </Form>}
          {item.inspectionScopes?.some((scope) => scope.revoked !== true) ? <ul className="item-scope-list">
            {item.inspectionScopes.filter((scope) => scope.revoked !== true).map((scope) => <li key={scope.id}>{scope.inspectionScope}</li>)}
          </ul> : <Typography.Text tone="secondary">No inspection scopes</Typography.Text>}
        </section>}
        <section className="company-view-section">
          <div className="company-view-section-heading">
            <div><h3>Sizes and Standard Prices</h3><Typography.Text tone="secondary">Add sizes and manage their standard prices.</Typography.Text></div>
            {canAddSize && !sizeFormOpen && <Button variant="primary" icon={<PlusOutlined />} onClick={() => setSizeFormOpen(true)}>Add Size</Button>}
          </div>
          {canAddSize && <div className={`item-add-size-panel${sizeFormOpen ? ' is-open' : ''}`} aria-hidden={!sizeFormOpen}>
            {sizeFormOpen && <Form form={sizeForm} className="item-add-size-form" layout="vertical" onFinish={addSize} disabled={Boolean(busy)} preserve={false} clearOnDestroy>
            <div className="item-add-size-top">
              <Form.Item name="size" rules={sizeRules}><Input maxLength={100} placeholder="Enter a new size" aria-label="New size" /></Form.Item>
              <Space wrap>
                <Button variant="primary" icon={<PlusOutlined />} htmlType="submit" busy={busy === 'add'}>Add Size</Button>
                {canAddNoSize && <Button icon={<PlusOutlined />} htmlType="button" busy={busy === 'add-no-size'} onClick={addNoSize}>Add No Size</Button>}
                <Button htmlType="button" disabled={Boolean(busy)} onClick={cancelSizeForm}>Cancel</Button>
              </Space>
            </div>
            <div className="item-add-size-prices">
              <div className="item-add-size-prices-heading">
                <Typography.Text strong>Optional standard prices</Typography.Text>
                <Typography.Text tone="secondary">Leave all fields blank to create the size without prices.</Typography.Text>
              </div>
              <div className="item-price-grid">
                {priceFields.filter((_, index) => index < 2 || hasMaintenance).map(([key, label]) =>
                  <Form.Item key={key} name={key} label={label} rules={[optionalPriceRule]}>
                    <PriceInput placeholder="Optional price" prefix="Rp" />
                  </Form.Item>)}
              </div>
            </div>
            </Form>}
          </div>}
          {error && <div className="item-error" role="alert">{error} <Button onClick={() => setRefresh((value) => value + 1)}>Retry</Button></div>}
          <Table className="item-size-table" rowKey="id" busy={loading} dataSource={data.sizes}
            tableLayout="auto" scroll={{ x: 'max-content' }}
            columns={[
              { title: 'Size', dataIndex: 'size', key: 'size', sorter: true,
                sortOrder: query.sortOrder ? (query.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
                filteredValue: query.size ? [query.size] : null,
                filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search size"
                  onSearch={(value) => setQuery((current) => ({ ...current, size: value.trim(), page: 1 }))} />,
                render: (value) => <Tag>{value ?? 'Without size'}</Tag> },
              { title: 'Price Status', dataIndex: 'priceStatus', render: (value) =>
                <Tag color={value === 'AVAILABLE' ? 'success' : 'default'}>{value === 'AVAILABLE' ? 'Available' : 'Unavailable'}</Tag> },
              ...visiblePrices.map(([key, title]) => ({ title, dataIndex: key, render: formatPrice })),
              { title: 'Actions', key: 'actions', fixed: 'right', render: (_, row) => <Space wrap size={4}>
                <Button variant="text" icon={readOnly || row.isActive === false ? <EyeOutlined /> : <EditOutlined />} busy={busy === row.id} disabled={Boolean(busy)}
                  title={readOnly || row.isActive === false ? 'View Price' : row.priceStatus === 'AVAILABLE' ? 'Edit Price' : 'Set Price'}
                  aria-label={`${readOnly || row.isActive === false ? 'View price' : row.priceStatus === 'AVAILABLE' ? 'Edit price' : 'Set price'} for ${row.size ?? 'Without size'}`}
                  onClick={() => openEditor(row)} />
                <Button variant="text" icon={<HistoryOutlined />} title="Price History" aria-label={`Price history for ${row.size ?? 'Without size'}`}
                  onClick={() => setHistory({ id: row.id, name: row.size ?? 'Without size', scope: 'price' })} />
                {!readOnly && row.isActive !== false && <>
                <Popconfirm title="Delete size?" description="This size and its standard and contract prices will be deactivated."
                  okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
                  onConfirm={() => mutate(row.id, () => itemService.removeSize(row.id, row.version), 'Item size deleted successfully.')}>
                  <Button variant="text" isDanger icon={<DeleteOutlined />} disabled={Boolean(busy)} aria-label={`Delete size ${row.size ?? 'Without size'}`} />
                </Popconfirm>
                </>}
              </Space> },
            ]}
            onChange={(next, filters, sorter) => setQuery((current) => ({
              ...current, page: next.pageSize !== current.limit ? 1 : next.current || 1, limit: next.pageSize,
              size: filters.size?.[0] || '', sortBy: sorter.order ? 'size' : '',
              sortOrder: sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '',
            }))}
            locale={{ emptyText: error ? 'Unable to load sizes.' : 'No sizes available.' }}
            pagination={{ current: query.page, pageSize: query.limit, total: data.pagination.total, showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100], showTotal: (total) => `${total} active size` }} />
        </section>
        <ItemHistory record={item} revision={refresh} />
      </div>
    </Modal>
    <Modal title={`Standard Price: ${editor ? editor.size.size ?? 'Without size' : ''}`}
      visible={Boolean(editor)} width={680} onCancel={() => setEditor(null)} busy={busy === 'save'}
      closable={!busy} keyboard={!busy} mask={{ closable: !busy }} unmountOnClose
      footer={<Space wrap>
        <Button disabled={Boolean(busy)} onClick={() => setEditor(null)}>Cancel</Button>
        {!editorReadOnly && <Button variant="primary" busy={busy === 'save'} onClick={() => editForm.submit()}>
          Save
        </Button>}
      </Space>}>
      {editor && editorReadOnly && <dl className="company-detail-grid">
        {priceFields.filter((_, index) => index < 2 || editorHasMaintenance).map(([key, label]) =>
          <div key={key}><dt>{label}</dt><dd>{formatPrice(editor.price?.[key])}</dd></div>)}
      </dl>}
      {editor && !editorReadOnly && <Form key={editor.size.id} form={editForm} layout="vertical"
        onFinish={save} disabled={Boolean(busy)}>
        {<>
          <p><Typography.Text tone="secondary">
            Enter the standard prices for this size. Zero is allowed.
          </Typography.Text></p>
          <div className="item-price-grid">
            {priceFields.filter((_, index) => index < 2 || editorHasMaintenance).map(([key, label]) =>
              <Form.Item key={key} name={key} label={label} required rules={[priceRule]}>
                <PriceInput placeholder="Enter price" prefix="Rp" />
              </Form.Item>)}
          </div>
        </>}
      </Form>}
    </Modal>
    <Modal title={history ? `${history.scope === 'price' ? 'Price' : 'Size'} History: ${history.name}` : 'History'}
      visible={Boolean(history)} width={1000} onCancel={() => setHistory(null)}
      footer={<Button onClick={() => setHistory(null)}>Close</Button>} unmountOnClose>
      {history && <ItemHistory key={`${history.scope}-${history.id}`} record={history} scope={history.scope} expanded revision={refresh} />}
    </Modal>
  </>
}
