import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  TableSearchFilter,
  Tag,
  Typography,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '../../components/global'
import { menuService } from '../../services/menuService'
import { menuItemService } from '../../services/menuItemService'
import './MenuPage.css'

const DEFAULT_PAGE_SIZE = 50

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function MenuItemPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [items, setItems] = useState([])
  const [parentMenus, setParentMenus] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [menuFilter, setMenuFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const requestIdRef = useRef(0)

  const menuOptions = useMemo(
    () => parentMenus.map((menu) => ({ value: menu.id, label: menu.label })),
    [parentMenus],
  )
  const menuLabels = useMemo(
    () => new Map(parentMenus.map((menu) => [menu.id, menu.label])),
    [parentMenus],
  )

  const loadParentMenus = useCallback(async () => {
    try {
      const response = await menuService.list({ page: 1, limit: 100 })
      setParentMenus(response.data?.menus || [])
    } catch (error) {
      message.error(error.message)
    }
  }, [message])

  const loadItems = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const response = await menuItemService.list({
        page,
        limit: pageSize,
        search,
        menuId: menuFilter,
        isActive: activeFilter,
        sortBy,
        sortOrder,
      })
      if (requestId !== requestIdRef.current) return
      setItems(response.data?.items || [])
      setPagination(response.data?.pagination || { page, total: 0, totalPages: 1 })
    } catch (error) {
      if (requestId === requestIdRef.current) message.error(error.message)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [activeFilter, menuFilter, message, page, pageSize, search, sortBy, sortOrder])

  useEffect(() => {
    loadParentMenus()
  }, [loadParentMenus])

  useEffect(() => {
    const timeoutId = setTimeout(loadItems, 300)
    return () => clearTimeout(timeoutId)
  }, [loadItems])

  const openCreate = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({
      menuId: menuFilter || undefined,
      key: '',
      label: '',
      path: '',
      order: 0,
      isActive: true,
    })
    setModalOpen(true)
  }

  const openEdit = async (item) => {
    setLoadingDetailId(item.id)
    try {
      const response = await menuItemService.get(item.id)
      const detail = response.data?.menuItem || response.data?.item || response.data

      if (!detail?.id) throw new Error('Data detail menu item tidak valid.')

      setEditingItem(detail)
      form.resetFields()
      form.setFieldsValue({
        menuId: detail.menuId || detail.menu?.id,
        key: detail.key,
        label: detail.label,
        path: detail.path,
        order: detail.order,
        isActive: detail.isActive,
      })
      setModalOpen(true)
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoadingDetailId(null)
    }
  }

  const saveItem = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editingItem) {
        await menuItemService.update(editingItem.id, values)
        message.success('Menu item berhasil diperbarui.')
      } else {
        await menuItemService.create({
          menuId: values.menuId,
          key: values.key,
          label: values.label,
          path: values.path,
          order: values.order,
        })
        message.success('Menu item berhasil dibuat.')
      }
      setModalOpen(false)
      await loadItems()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (item) => {
    try {
      await menuItemService.remove(item.id)
      message.success('Menu item berhasil dihapus.')
      if (items.length === 1 && page > 1) setPage((current) => current - 1)
      else await loadItems()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1)
    setMenuFilter(filters.menuId?.[0] || '')
    setActiveFilter(filters.isActive?.[0] || '')
    setSortBy(sorter.order ? sorter.field : '')
    setSortOrder(sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '')
  }

  const columns = [
    {
      title: 'Menu',
      dataIndex: 'menuId',
      key: 'menuId',
      sorter: true,
      sortOrder: getSortOrder('menuId', sortBy, sortOrder),
      filters: menuOptions.map((option) => ({ text: option.label, value: option.value })),
      filterMultiple: false,
      filteredValue: menuFilter ? [menuFilter] : null,
      render: (menuId) => menuLabels.get(menuId) || menuId,
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      sorter: true,
      sortOrder: getSortOrder('key', sortBy, sortOrder),
      filteredValue: search ? [search] : null,
      filterDropdown: (props) => (
        <TableSearchFilter
          {...props}
          placeholder="Cari key, label, atau path"
          onSearch={(value) => { setSearch(value); setPage(1) }}
        />
      ),
      render: (value) => <Typography.Text code>{value}</Typography.Text>,
    },
    { title: 'Label', dataIndex: 'label', key: 'label', sorter: true, sortOrder: getSortOrder('label', sortBy, sortOrder) },
    { title: 'Path', dataIndex: 'path', key: 'path', sorter: true, sortOrder: getSortOrder('path', sortBy, sortOrder), render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: 'Urutan', dataIndex: 'order', key: 'order', width: 90, sorter: true, sortOrder: getSortOrder('order', sortBy, sortOrder) },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      sorter: true,
      sortOrder: getSortOrder('isActive', sortBy, sortOrder),
      filters: [
        { text: 'Aktif', value: 'true' },
        { text: 'Nonaktif', value: 'false' },
      ],
      filterMultiple: false,
      filteredValue: activeFilter ? [activeFilter] : null,
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Aktif' : 'Nonaktif'}</Tag>,
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, item) => (
        <Space>
          <Button
            variant="text"
            icon={<EditOutlined />}
            busy={loadingDetailId === item.id}
            onClick={() => openEdit(item)}
            aria-label={`Edit ${item.label}`}
          />
          <Popconfirm title="Hapus menu item?" okText="Hapus" cancelText="Batal" okButtonProps={{ danger: true }} onConfirm={() => deleteItem(item)}>
            <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label={`Hapus ${item.label}`} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section className="menu-page">
      <div className="menu-page-heading">
        <div>
          <Typography.Title level={2}>Manajemen Menu Item</Typography.Title>
          <Typography.Text tone="secondary">Kelola route aktif yang ditampilkan di dalam setiap menu.</Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!parentMenus.length}>Tambah menu item</Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={items}
          scroll={{ x: 950 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} menu item`,
          }}
        />
      </Card>

      <Modal title={editingItem ? 'Edit menu item' : 'Tambah menu item'} visible={modalOpen} busy={saving} okText={editingItem ? 'Simpan' : 'Tambah'} cancelText="Batal" onOk={saveItem} onCancel={() => setModalOpen(false)} preRender unmountOnClose>
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="menuId" label="Parent menu" rules={[{ required: true, message: 'Parent menu wajib dipilih.' }]}>
            <Select showSearch optionFilterProp="label" options={menuOptions} placeholder="Pilih menu" />
          </Form.Item>
          <Form.Item name="key" label="Key" rules={[{ required: true, message: 'Key wajib diisi.' }, { pattern: /^[a-z0-9_-]+$/, message: 'Gunakan huruf kecil, angka, underscore, atau tanda hubung.' }, { max: 100 }]}>
            <Input placeholder="contoh: menu" />
          </Form.Item>
          <Form.Item name="label" label="Label" rules={[{ required: true, message: 'Label wajib diisi.' }, { max: 200 }]}>
            <Input placeholder="contoh: Menu" />
          </Form.Item>
          <Form.Item name="path" label="Path" rules={[{ required: true, message: 'Path wajib diisi.' }, { max: 500 }]}>
            <Input placeholder="contoh: appmanager/menu" />
          </Form.Item>
          <Form.Item name="order" label="Urutan" rules={[{ required: true, message: 'Urutan wajib diisi.' }]}>
            <InputNumber min={0} precision={0} className="menu-order-input" />
          </Form.Item>
          {editingItem && <Form.Item name="isActive" label="Status" valuePropName="checked"><Switch activeLabel="Aktif" inactiveLabel="Nonaktif" /></Form.Item>}
        </Form>
      </Modal>
    </section>
  )
}

export default MenuItemPage
