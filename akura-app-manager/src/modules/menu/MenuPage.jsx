import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
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
import './MenuPage.css'

const DEFAULT_PAGE_SIZE = 20

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function MenuPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [menus, setMenus] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingMenu, setEditingMenu] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const requestIdRef = useRef(0)

  const loadMenus = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const response = await menuService.list({
        page,
        limit: pageSize,
        search,
        isActive: activeFilter,
        sortBy,
        sortOrder,
      })
      if (requestId !== requestIdRef.current) return
      setMenus(response.data?.menus || [])
      setPagination(response.data?.pagination || { page, total: 0, totalPages: 1 })
    } catch (error) {
      if (requestId === requestIdRef.current) message.error(error.message)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [activeFilter, message, page, pageSize, search, sortBy, sortOrder])

  useEffect(() => {
    const timeoutId = setTimeout(loadMenus, 300)
    return () => clearTimeout(timeoutId)
  }, [loadMenus])

  const openCreate = () => {
    setEditingMenu(null)
    form.resetFields()
    form.setFieldsValue({ key: '', label: '', order: 0, isActive: true })
    setModalOpen(true)
  }

  const openEdit = async (menu) => {
    setLoadingDetailId(menu.id)
    try {
      const response = await menuService.get(menu.id)
      const detail = response.data?.menu || response.data

      if (!detail?.id) throw new Error('Invalid menu detail data.')

      setEditingMenu(detail)
      form.resetFields()
      form.setFieldsValue({
        key: detail.key,
        label: detail.label,
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

  const saveMenu = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editingMenu) {
        await menuService.update(editingMenu.id, values)
        message.success('Menu updated successfully.')
      } else {
        const createPayload = {
          key: values.key,
          label: values.label,
          order: values.order,
        }
        await menuService.create(createPayload)
        message.success('Menu created successfully.')
      }
      setModalOpen(false)
      await loadMenus()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteMenu = async (menu) => {
    try {
      await menuService.remove(menu.id)
      message.success('Menu deleted successfully.')
      if (menus.length === 1 && page > 1) setPage((current) => current - 1)
      else await loadMenus()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1)
    setActiveFilter(filters.isActive?.[0] || '')
    setSortBy(sorter.order ? sorter.field : '')
    setSortOrder(sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '')
  }

  const columns = [
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
          placeholder="Search key or label"
          onSearch={(value) => { setSearch(value); setPage(1) }}
        />
      ),
      render: (value) => <Typography.Text code>{value}</Typography.Text>,
    },
    { title: 'Label', dataIndex: 'label', key: 'label', sorter: true, sortOrder: getSortOrder('label', sortBy, sortOrder) },
    { title: 'Order', dataIndex: 'order', key: 'order', width: 100, sorter: true, sortOrder: getSortOrder('order', sortBy, sortOrder) },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      sorter: true,
      sortOrder: getSortOrder('isActive', sortBy, sortOrder),
      filters: [
        { text: 'Active', value: 'true' },
        { text: 'Inactive', value: 'false' },
      ],
      filterMultiple: false,
      filteredValue: activeFilter ? [activeFilter] : null,
      render: (isActive) => <Tag color={isActive ? 'success' : 'default'}>{isActive ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_, menu) => (
        <Space>
          <Button
            variant="text"
            icon={<EditOutlined />}
            busy={loadingDetailId === menu.id}
            onClick={() => openEdit(menu)}
            aria-label={`Edit ${menu.label}`}
          />
          <Popconfirm
            title="Delete menu?"
            description="All items in this menu will also be deleted."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMenu(menu)}
          >
            <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label={`Delete ${menu.label}`} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section className="menu-page">
      <div className="menu-page-heading">
        <div>
          <Typography.Title level={2}>Menu Management</Typography.Title>
          <Typography.Text tone="secondary">Manage the menu groups displayed in the application navigation.</Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Menu</Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={menus}
          scroll={{ x: 720 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} menu`,
          }}
        />
      </Card>

      <Modal
        title={editingMenu ? 'Edit Menu' : 'Add Menu'}
        visible={modalOpen}
        width={720}
        busy={saving}
        okText={editingMenu ? 'Save' : 'Add'}
        cancelText="Cancel"
        onOk={saveMenu}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="key"
            label="Key"
            rules={[
              { required: true, message: 'Key is required.' },
              { pattern: /^[a-z0-9_-]+$/, message: 'Use lowercase letters, numbers, underscores, or hyphens.' },
              { max: 100 },
            ]}
          >
            <Input placeholder="example: app_manager" />
          </Form.Item>
          <Form.Item name="label" label="Label" rules={[{ required: true, message: 'Label is required.' }, { max: 200 }]}>
            <Input placeholder="example: App Manager" />
          </Form.Item>
          <Form.Item name="order" label="Order" rules={[{ required: true, message: 'Order is required.' }]}>
            <InputNumber min={0} precision={0} className="menu-order-input" />
          </Form.Item>
          {editingMenu && (
            <Form.Item name="isActive" label="Status" valuePropName="checked">
              <Switch activeLabel="Active" inactiveLabel="Inactive" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </section>
  )
}

export default MenuPage
