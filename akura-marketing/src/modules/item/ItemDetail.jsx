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
const priceRule = { validator: async (_, value) => {
  if (value == null || value === '') throw new Error('Price is required.')
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(String(value))) throw new Error('Enter a price with up to 16 digits and two decimal places.')
} }

export default function ItemDetail({ item, visible, onClose, afterClose, onUpdate, onChange, onDetailChange }) {
  const { message } = App.useApp()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [sizeForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [query, setQuery] = useState({ page: 1, limit: 20, size: '', sortBy: '', sortOrder: '' })
  const [data, setData] = useState({ sizes: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState('')
  const [history, setHistory] = useState(null)
  const lock = useRef(false)
  const readOnly = item?.isActive === false
  const editorReadOnly = readOnly || editor?.size.isActive === false || editor?.size.item?.isActive === false || editor?.price?.isActive === false
  const itemId = item?.id

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
    if (readOnly || lock.current || !await confirmSave('item size')) return
    await mutate('add', () => itemService.addSize({ itemId, itemVersion: item.version, size: values.size.trim() }),
      'Item size added successfully.', () => sizeForm.resetFields())
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
        <section className="company-view-section">
          <div className="company-view-section-heading">
            <div><h3>Sizes and Standard Prices</h3><Typography.Text tone="secondary">Add sizes and manage their standard prices.</Typography.Text></div>
          </div>
          {!readOnly && <Form form={sizeForm} className="item-add-size-form" onFinish={addSize} disabled={Boolean(busy)} preserve={false} clearOnDestroy>
            <Form.Item name="size" rules={sizeRules}><Input maxLength={100} placeholder="Enter a new size" aria-label="New size" /></Form.Item>
            <Button variant="primary" icon={<PlusOutlined />} htmlType="submit" busy={busy === 'add'}>Add Size</Button>
          </Form>}
          {error && <div className="item-error" role="alert">{error} <Button onClick={() => setRefresh((value) => value + 1)}>Retry</Button></div>}
          <Table className="item-size-table" rowKey="id" busy={loading} dataSource={data.sizes}
            tableLayout="fixed" scroll={{ x: hasMaintenance ? 1280 : 940 }}
            columns={[
              { title: 'Size', dataIndex: 'size', key: 'size', width: 140, sorter: true,
                sortOrder: query.sortOrder ? (query.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
                filteredValue: query.size ? [query.size] : null,
                filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search size"
                  onSearch={(value) => setQuery((current) => ({ ...current, size: value.trim(), page: 1 }))} />,
                render: (value) => <Tag>{value}</Tag> },
              { title: 'Price Status', dataIndex: 'priceStatus', width: 130, render: (value) =>
                <Tag color={value === 'AVAILABLE' ? 'success' : 'default'}>{value === 'AVAILABLE' ? 'Available' : 'Unavailable'}</Tag> },
              ...visiblePrices.map(([key, title]) => ({ title, dataIndex: key, width: 170, render: formatPrice })),
              { title: 'Actions', key: 'actions', width: 260, fixed: 'right', render: (_, row) => <Space wrap size={4}>
                <Button variant="text" icon={readOnly || row.isActive === false ? <EyeOutlined /> : <EditOutlined />} busy={busy === row.id} disabled={Boolean(busy)}
                  title={readOnly || row.isActive === false ? 'View Price' : row.priceStatus === 'AVAILABLE' ? 'Edit Price' : 'Set Price'}
                  aria-label={`${readOnly || row.isActive === false ? 'View price' : row.priceStatus === 'AVAILABLE' ? 'Edit price' : 'Set price'} for size ${row.size}`}
                  onClick={() => openEditor(row)} />
                {!readOnly && row.isActive !== false && <>
                <Button variant="text" icon={<HistoryOutlined />} title="Size History" aria-label={`History for size ${row.size}`}
                  onClick={() => setHistory({ id: row.id, name: row.size, scope: 'size' })} />
                <Popconfirm title="Delete size?" description="This size and its standard and contract prices will be deactivated."
                  okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
                  onConfirm={() => mutate(row.id, () => itemService.removeSize(row.id, row.version), 'Item size deleted successfully.')}>
                  <Button variant="text" isDanger icon={<DeleteOutlined />} disabled={Boolean(busy)} aria-label={`Delete size ${row.size}`} />
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
    <Modal title={`Standard Price: ${editor?.size.size || ''}`}
      visible={Boolean(editor)} width={680} onCancel={() => setEditor(null)} busy={busy === 'save'}
      closable={!busy} keyboard={!busy} mask={{ closable: !busy }} unmountOnClose
      footer={<Space wrap>
        {editor && <>
          <Button icon={<HistoryOutlined />} onClick={() => setHistory({ id: editor.size.id, name: editor.size.size, scope: 'price' })}>Price History</Button>
          {!editorReadOnly && editor.price?.isActive && <Popconfirm title="Delete standard price?" description="The size remains available. Its standard price will be deactivated."
            okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }} onConfirm={() =>
              mutate('save', () => itemService.removePrice(editor.size.id, editor.price.version), 'Standard price deleted successfully.', () => setEditor(null))}>
            <Button isDanger disabled={Boolean(busy)} icon={<DeleteOutlined />}>Delete Price</Button>
          </Popconfirm>}
        </>}
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
