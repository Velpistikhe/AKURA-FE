import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  DeleteOutlined,
  EditOutlined,
  Form,
  Modal,
  PlusOutlined,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from '../../components/global'
import { menuAccessService } from '../../services/menuAccessService'
import { menuItemService } from '../../services/menuItemService'
import './MenuPage.css'

const DEFAULT_PAGE_SIZE = 20
const ROLES = ['USER', 'ADMIN', 'APP_MANAGER']
const SECTIONS = ['ACCOUNTING', 'FINANCE', 'HRD_MANAGEMENT', 'MARKETING', 'FIELD_SERVICE']
const ROLE_OPTIONS = [
  { value: 'ALL', label: 'ALL (all roles)' },
  ...ROLES.map((value) => ({ value, label: value })),
]
const SECTION_OPTIONS = [
  { value: 'ALL', label: 'ALL (all sections)' },
  ...SECTIONS.map((value) => ({ value, label: value })),
]

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function toFormValue(value) {
  return value || 'ALL'
}

function toPayloadValue(value) {
  return value === 'ALL' ? null : value
}

function MenuAccessPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [accesses, setAccesses] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [menuItemFilter, setMenuItemFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingAccess, setEditingAccess] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const requestIdRef = useRef(0)

  const menuItemOptions = useMemo(
    () => menuItems.map((item) => ({
      value: item.id,
      label: `${item.label} (${item.key})`,
    })),
    [menuItems],
  )
  const menuItemLabels = useMemo(
    () => new Map(menuItemOptions.map((item) => [item.value, item.label])),
    [menuItemOptions],
  )

  const loadMenuItems = useCallback(async () => {
    try {
      const response = await menuItemService.list({ page: 1, limit: 100 })
      setMenuItems(response.data?.items || [])
    } catch (error) {
      message.error(error.message)
    }
  }, [message])

  const loadAccesses = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const response = await menuAccessService.list({
        page,
        limit: pageSize,
        menuItemId: menuItemFilter,
        role: roleFilter,
        section: sectionFilter,
        sortBy,
        sortOrder,
      })
      if (requestId !== requestIdRef.current) return
      setAccesses(response.data?.menuAccesses || [])
      setPagination(response.data?.pagination || { page, total: 0, totalPages: 1 })
    } catch (error) {
      if (requestId === requestIdRef.current) message.error(error.message)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [menuItemFilter, message, page, pageSize, roleFilter, sectionFilter, sortBy, sortOrder])

  useEffect(() => {
    loadMenuItems()
  }, [loadMenuItems])

  useEffect(() => {
    loadAccesses()
  }, [loadAccesses])

  const openCreate = () => {
    setEditingAccess(null)
    form.resetFields()
    form.setFieldsValue({
      menuItemId: menuItemFilter || undefined,
      role: 'ALL',
      section: 'ALL',
    })
    setModalOpen(true)
  }

  const openEdit = async (access) => {
    setLoadingDetailId(access.id)
    try {
      const response = await menuAccessService.get(access.id)
      const detail = response.data?.menuAccess || response.data
      if (!detail?.id) throw new Error('Invalid menu access detail data.')

      setEditingAccess(detail)
      form.resetFields()
      form.setFieldsValue({
        menuItemId: detail.menuItemId || detail.menuItem?.id,
        role: toFormValue(detail.role),
        section: toFormValue(detail.section),
      })
      setModalOpen(true)
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoadingDetailId(null)
    }
  }

  const saveAccess = async () => {
    const values = await form.validateFields()
    const payload = {
      menuItemId: values.menuItemId,
      role: toPayloadValue(values.role),
      section: toPayloadValue(values.section),
    }

    setSaving(true)
    try {
      if (editingAccess) {
        await menuAccessService.update(editingAccess.id, payload)
        message.success('Menu access updated successfully.')
      } else {
        await menuAccessService.create(payload)
        message.success('Menu access created successfully.')
      }
      setModalOpen(false)
      await loadAccesses()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteAccess = async (access) => {
    try {
      await menuAccessService.remove(access.id)
      message.success('Menu access deleted successfully.')
      if (accesses.length === 1 && page > 1) setPage((current) => current - 1)
      else await loadAccesses()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1)
    setMenuItemFilter(filters.menuItemId?.[0] || '')
    setRoleFilter(filters.role?.[0] || '')
    setSectionFilter(filters.section?.[0] || '')
    setSortBy(sorter.order ? sorter.field : '')
    setSortOrder(sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '')
  }

  const columns = [
    {
      title: 'Menu Item',
      dataIndex: 'menuItemId',
      key: 'menuItemId',
      sorter: true,
      sortOrder: getSortOrder('menuItemId', sortBy, sortOrder),
      filters: menuItemOptions.map((option) => ({ text: option.label, value: option.value })),
      filterMultiple: false,
      filteredValue: menuItemFilter ? [menuItemFilter] : null,
      render: (menuItemId, access) => {
        if (access.menuItem) return `${access.menuItem.label} (${access.menuItem.key})`
        return menuItemLabels.get(menuItemId) || menuItemId
      },
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 180,
      sorter: true,
      sortOrder: getSortOrder('role', sortBy, sortOrder),
      filters: ROLES.map((value) => ({ text: value, value })),
      filterMultiple: false,
      filteredValue: roleFilter ? [roleFilter] : null,
      render: (value) => <Tag color="blue">{value || 'ALL'}</Tag>,
    },
    {
      title: 'Section',
      dataIndex: 'section',
      key: 'section',
      width: 220,
      sorter: true,
      sortOrder: getSortOrder('section', sortBy, sortOrder),
      filters: SECTIONS.map((value) => ({ text: value, value })),
      filterMultiple: false,
      filteredValue: sectionFilter ? [sectionFilter] : null,
      render: (value) => <Tag color="cyan">{value || 'ALL'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, access) => (
        <Space>
          <Button
            variant="text"
            icon={<EditOutlined />}
            busy={loadingDetailId === access.id}
            onClick={() => openEdit(access)}
            aria-label={`Edit access ${access.menuItem?.label || menuItemLabels.get(access.menuItemId) || access.menuItemId}`}
          />
          <Popconfirm
            title="Delete menu access?"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteAccess(access)}
          >
            <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label="Delete menu access" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section className="menu-page">
      <div className="menu-page-heading">
        <div>
          <Typography.Title level={2}>Menu Access</Typography.Title>
          <Typography.Text tone="secondary">Configure available menu items by role and section combination.</Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!menuItems.length}>Add Access</Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={accesses}
          scroll={{ x: 850 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} access menu`,
          }}
        />
      </Card>

      <Modal
        title={editingAccess ? 'Edit Menu Access' : 'Add Menu Access'}
        visible={modalOpen}
        busy={saving}
        okText={editingAccess ? 'Save' : 'Add'}
        cancelText="Cancel"
        onOk={saveAccess}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="menuItemId" label="Menu Item" rules={[{ required: true, message: 'Menu item is required.' }]}>
            <Select showSearch optionFilterProp="label" options={menuItemOptions} placeholder="Select menu item" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Role is required.' }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="section" label="Section" rules={[{ required: true, message: 'Section is required.' }]}>
            <Select options={SECTION_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

export default MenuAccessPage
