import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App, Button, Card, DeleteOutlined, DownloadOutlined, EyeOutlined, Form, Input,
  Modal, PlusOutlined, Popconfirm, Select, Space, Table, TableSearchFilter, Typography, useSaveConfirmation,
} from '../../components/global'
import { itemService } from '../../services/itemService'
import { serviceService } from '../../services/serviceService'
import { downloadFile } from '../../services/downloadFile'
import ItemDetail from './ItemDetail'
import { createItemPayload } from './itemModel'
import '../company/CompanyPage.css'
import '../service/ServiceCatalogPage.css'
import './ItemPage.css'

const labelKey = (value) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()

export default function ItemPage() {
  const { message } = App.useApp()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [form] = Form.useForm()
  const sizeValues = Form.useWatch('sizes', form) || []
  const [items, setItems] = useState([])
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [servicesError, setServicesError] = useState('')
  const [query, setQuery] = useState({ page: 1, limit: 20, name: '', serviceName: '', sortBy: '', sortOrder: '' })
  const [pagination, setPagination] = useState({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const [detail, setDetail] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const mutationRef = useRef(false)
  const downloadRef = useRef(false)
  const detailRequestRef = useRef(0)
  const reload = () => setRefresh((value) => value + 1)

  const loadServices = useCallback(async () => {
    setServicesLoading(true)
    setServicesError('')
    try {
      const records = []
      let page = 1
      let totalPages = 1
      do {
        const response = await serviceService.list({ page, limit: 100, isActive: 'true' })
        records.push(...(response.data?.services || []))
        totalPages = response.data?.pagination?.totalPages || 1
        page += 1
      } while (page <= totalPages)
      setServices(records)
    } catch (error) {
      setServicesError(error.message)
    } finally {
      setServicesLoading(false)
    }
  }, [])

  useEffect(() => { loadServices() }, [loadServices])

  useEffect(() => {
    let active = true
    setLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const response = await itemService.list(query)
        if (!active) return
        setItems(response.data?.items || [])
        setPagination(response.data?.pagination || { total: 0 })
      } catch (error) {
        if (active) message.error(error.message)
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => { active = false; clearTimeout(timeout) }
  }, [query, refresh, message])

  const openDetail = async (item) => {
    const request = ++detailRequestRef.current
    setLoadingDetailId(item.id)
    try {
      const response = await itemService.get(item.id)
      if (request !== detailRequestRef.current) return
      if (!response.data?.id) throw new Error('Invalid item detail data.')
      setDetail(response.data)
      setDetailOpen(true)
    } catch (error) {
      if (request === detailRequestRef.current) message.error(error.message)
    } finally {
      if (request === detailRequestRef.current) setLoadingDetailId(null)
    }
  }

  const openEditor = (item = null) => {
    if (item?.isActive === false) return
    if (item) setDetailOpen(false)
    setEditor({ item })
  }

  const save = async (values) => {
    if (mutationRef.current || editor?.item?.isActive === false) return
    const item = editor.item
    const name = values.name.trim()
    const uom = values.uom.trim()
    if (item && labelKey(name) === labelKey(item.name) && uom === item.uom) {
      message.warning('No changes were made.')
      return
    }
    mutationRef.current = true
    try {
      if (!await confirmSave('item')) return
      setSaving(true)
      if (item) await itemService.update(item.id, { version: item.version, name, uom })
      else await itemService.create(createItemPayload(values))
      message.success(`Item ${item ? 'updated' : 'created'} successfully.`)
      setEditor(null)
      reload()
      if (item) await openDetail(item)
    } catch (error) {
      message.error(error.message)
      if (error.status === 409) {
        message.warning('Review the latest data and check for duplicate names before trying again.')
        setEditor(null)
        reload()
        if (item) await openDetail(item)
      }
    } finally {
      mutationRef.current = false
      setSaving(false)
    }
  }

  const remove = async (item) => {
    if (mutationRef.current || item.isActive === false) return
    mutationRef.current = true
    setDeletingId(item.id)
    try {
      await itemService.remove(item.id, item.version)
      message.success('Item deleted successfully.')
      if (items.length === 1 && query.page > 1) setQuery((current) => ({ ...current, page: current.page - 1 }))
      else reload()
    } catch (error) {
      message.error(error.message)
      if (error.status === 409) reload()
    } finally {
      mutationRef.current = false
      setDeletingId(null)
    }
  }

  const download = async () => {
    if (downloadRef.current) return
    downloadRef.current = true
    setDownloading(true)
    try {
      const { blob } = await itemService.download({ itemName: query.name, serviceName: query.serviceName })
      downloadFile(blob, 'akura-normal-prices.xlsx')
    } catch (error) {
      message.error(error.message)
    } finally {
      downloadRef.current = false
      setDownloading(false)
    }
  }

  const searchColumn = (title, key, render) => ({
    title, key, dataIndex: key, width: 280, sorter: true,
    sortOrder: query.sortBy === key ? (query.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
    filteredValue: query[key] ? [query[key]] : null,
    filterDropdown: (props) => <TableSearchFilter {...props} placeholder={`Search ${title.toLowerCase()}`}
      onSearch={(value) => setQuery((current) => ({ ...current, [key]: value.trim(), page: 1 }))} />,
    render,
  })

  return <section className="company-page item-page">
    {saveConfirmation}
    <div className="company-page-heading">
      <div>
        <Typography.Title level={2}>Item Management</Typography.Title>
        <Typography.Text tone="secondary">Manage items, sizes and standard prices in Akura Marketing.</Typography.Text>
      </div>
      <Space wrap>
        <Button icon={<DownloadOutlined />} busy={downloading} onClick={download}>Download Items</Button>
        <Button variant="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>Add Item</Button>
      </Space>
    </div>
    <Card>
      <Table rowKey="id" busy={loading} dataSource={items} tableLayout="fixed" scroll={{ x: 760 }}
        columns={[
          searchColumn('Service', 'serviceName', (_, item) => <Typography.Text className="item-name">{item.service?.name || '-'}</Typography.Text>),
          searchColumn('Item Name', 'name', (value) => <Typography.Text className="item-name">{value}</Typography.Text>),
          { title: 'Actions', key: 'actions', width: 150, fixed: 'right', render: (_, item) => <Space>
            <Button variant="text" icon={<EyeOutlined />} busy={loadingDetailId === item.id} title="View Item"
              aria-label={`View ${item.name}`} onClick={() => openDetail(item)} />
            {item.isActive !== false && <Popconfirm title="Delete item?" description="The item, its sizes and their prices will be deactivated."
              okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }} onConfirm={() => remove(item)}>
              <Button variant="text" isDanger icon={<DeleteOutlined />} busy={deletingId === item.id} aria-label={`Delete ${item.name}`} />
            </Popconfirm>}
          </Space> },
        ]}
        onChange={(next, filters, sorter) => setQuery((current) => ({
          ...current, page: next.pageSize !== current.limit ? 1 : next.current || 1, limit: next.pageSize,
          name: filters.name?.[0] || '', serviceName: filters.serviceName?.[0] || '',
          sortBy: sorter.order ? sorter.columnKey : '', sortOrder: sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '',
        }))}
        pagination={{ current: query.page, pageSize: query.limit, total: pagination.total, showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100], showTotal: (total) => `${total} item` }} />
    </Card>
    <Modal title={editor?.item ? 'Edit Item' : 'Add Item'} visible={Boolean(editor)} width={680}
      busy={saving} okText={editor?.item ? 'Save' : 'Add'} onOk={() => form.submit()} onCancel={() => setEditor(null)}
      cancelButtonProps={{ disabled: saving }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }} unmountOnClose>
      {editor && <Form key={editor.item?.id || 'create'} form={form} layout="vertical" preserve={false} clearOnDestroy
        initialValues={{ name: editor.item?.name || '', uom: editor.item?.uom || '', sizes: [] }} onFinish={save} disabled={saving}>
        {!editor.item && <>
          {servicesError && <div role="alert" className="item-error">{servicesError} <Button onClick={loadServices}>Retry</Button></div>}
          <Form.Item name="serviceId" label="Service" rules={[{ required: true, message: 'Service is required.' }]}>
            <Select placeholder="Select a service" showSearch optionFilterProp="label" loading={servicesLoading}
              options={services.map((service) => ({ value: service.id, label: service.name }))} />
          </Form.Item>
        </>}
        <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: 'Name is required.' }, { max: 200 }]}>
          <Input maxLength={200} placeholder="Item name" />
        </Form.Item>
        <Form.Item name="uom" label="UOM (Unit of Measure)" rules={[{ required: true, whitespace: true, message: 'UOM is required.' }, { max: 50 }]}>
          <Input maxLength={50} placeholder="e.g. JOINT" />
        </Form.Item>
        {!editor.item && <Form.List name="sizes" rules={[{ validator: async (_, sizes = []) => {
          if (sizes.length > 100) throw new Error('A maximum of 100 sizes is allowed.')
          const names = sizes.map((size) => size?.size === null ? null : labelKey(size?.size || ''))
          if (new Set(names).size !== names.length) throw new Error('Size names must be unique.')
        } }]}>
          {(fields, { add, remove: removeSize }, { errors }) => <div className="catalog-scopes">
            <div className="catalog-scopes-heading">
              <Typography.Text strong>Sizes</Typography.Text>
              <Space wrap>
                <Button variant="dashed" icon={<PlusOutlined />} disabled={fields.length >= 100 || sizeValues.some((value) => value?.size === null)}
                  onClick={() => add({ size: null })}>Add Without Size</Button>
                <Button variant="dashed" icon={<PlusOutlined />} disabled={fields.length >= 100} onClick={() => add({ size: '' })}>Add Size</Button>
              </Space>
            </div>
            <p><Typography.Text tone="secondary">Leave this list empty to create one variant without a size. You can also combine named sizes with one variant without a size. Set standard prices from the item detail.</Typography.Text></p>
            {fields.map(({ key, ...field }) => <div className="catalog-scope-row" key={key}>
              <Form.Item {...field} name={[field.name, 'size']} getValueProps={(value) => ({ value: value ?? '' })}
                rules={sizeValues[field.name]?.size === null ? [] : [{ required: true, whitespace: true, message: 'Size is required.' }, { max: 100 }]}>
                <Input maxLength={100} disabled={sizeValues[field.name]?.size === null}
                  placeholder={sizeValues[field.name]?.size === null ? 'Without size' : 'Size'} />
              </Form.Item>
              <Button variant="text" isDanger icon={<DeleteOutlined />} onClick={() => removeSize(field.name)} aria-label="Delete size" />
            </div>)}
            <Form.ErrorList errors={errors} />
          </div>}
        </Form.List>}
      </Form>}
    </Modal>
    <ItemDetail key={detail?.id || 'closed'} item={detail} visible={detailOpen} onClose={() => setDetailOpen(false)}
      afterClose={() => { if (!detailOpen) setDetail(null) }}
      onUpdate={openEditor} onChange={reload} onDetailChange={setDetail} />
  </section>
}
