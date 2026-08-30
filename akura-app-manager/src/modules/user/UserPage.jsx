import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  EditOutlined,
  Form,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  TableSearchFilter,
  Tag,
  Typography,
} from '../../components/global'
import { userService } from '../../services/userService'
import '../menu/MenuPage.css'

const DEFAULT_PAGE_SIZE = 20
const ROLES = ['USER', 'ADMIN', 'APP_MANAGER']
const SECTIONS = ['ACCOUNTING', 'HRD_MANAGEMENT', 'MARKETING', 'FIELD_SERVICE']
const SECTION_OPTIONS = [
  { value: 'ALL', label: 'Tanpa section' },
  ...SECTIONS.map((section) => ({ value: section, label: section })),
]

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function responseUser(response) {
  return response.data?.user || response.data
}

function UserPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const requestIdRef = useRef(0)

  const loadUsers = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const response = await userService.list({
        page,
        limit: pageSize,
        search,
        role: roleFilter,
        section: sectionFilter,
        isActive: activeFilter,
        sortBy,
        sortOrder,
      })
      if (requestId !== requestIdRef.current) return
      setUsers(response.data?.users || [])
      setPagination(response.data?.pagination || { page, total: 0, totalPages: 1 })
    } catch (error) {
      if (requestId === requestIdRef.current) message.error(error.message)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [activeFilter, message, page, pageSize, roleFilter, search, sectionFilter, sortBy, sortOrder])

  useEffect(() => {
    const timeoutId = setTimeout(loadUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [loadUsers])

  const openEdit = async (user) => {
    setLoadingDetailId(user.id)
    try {
      const detail = responseUser(await userService.get(user.id))
      if (!detail?.id) throw new Error('Data detail user tidak valid.')

      setEditingUser(detail)
      form.resetFields()
      form.setFieldsValue({
        role: detail.role,
        section: detail.section || 'ALL',
        isActive: detail.isActive,
      })
      setModalOpen(true)
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoadingDetailId(null)
    }
  }

  const saveUser = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      let currentUser = editingUser
      let changed = false

      if (values.role !== currentUser.role) {
        currentUser = responseUser(await userService.setRole(currentUser.id, {
          role: values.role,
          version: currentUser.version,
        }))
        changed = true
      }

      const nextSection = values.section === 'ALL' ? null : values.section
      if (nextSection !== currentUser.section) {
        currentUser = responseUser(await userService.setSection(currentUser.id, {
          section: nextSection,
          version: currentUser.version,
        }))
        changed = true
      }

      if (values.isActive !== currentUser.isActive) {
        currentUser = responseUser(await userService.setStatus(currentUser.id, {
          isActive: values.isActive,
          version: currentUser.version,
        }))
        changed = true
      }

      message.success(changed ? 'User berhasil diperbarui.' : 'Tidak ada perubahan pada user.')
      setModalOpen(false)
      await loadUsers()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1)
    setRoleFilter(filters.role?.[0] || '')
    setSectionFilter(filters.section?.[0] || '')
    setActiveFilter(filters.isActive?.[0] || '')
    setSortBy(sorter.order ? sorter.field : '')
    setSortOrder(sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '')
  }

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      sorter: true,
      sortOrder: getSortOrder('username', sortBy, sortOrder),
      filteredValue: search ? [search] : null,
      filterDropdown: (props) => (
        <TableSearchFilter
          {...props}
          placeholder="Cari username atau nama"
          onSearch={(value) => { setSearch(value); setPage(1) }}
        />
      ),
      render: (value) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: 'Nama',
      dataIndex: 'firstName',
      key: 'firstName',
      sorter: true,
      sortOrder: getSortOrder('firstName', sortBy, sortOrder),
      render: (_, user) => [user.firstName, user.lastName].filter(Boolean).join(' ') || '-',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      sorter: true,
      sortOrder: getSortOrder('role', sortBy, sortOrder),
      filters: ROLES.map((role) => ({ text: role, value: role })),
      filterMultiple: false,
      filteredValue: roleFilter ? [roleFilter] : null,
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: 'Section',
      dataIndex: 'section',
      key: 'section',
      sorter: true,
      sortOrder: getSortOrder('section', sortBy, sortOrder),
      filters: SECTIONS.map((section) => ({ text: section, value: section })),
      filterMultiple: false,
      filteredValue: sectionFilter ? [sectionFilter] : null,
      render: (value) => value || 'Tanpa section',
    },
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
      width: 90,
      fixed: 'right',
      render: (_, user) => (
        <Space>
          <Button
            variant="text"
            icon={<EditOutlined />}
            busy={loadingDetailId === user.id}
            onClick={() => openEdit(user)}
            aria-label={`Edit ${user.username}`}
          />
        </Space>
      ),
    },
  ]

  return (
    <section className="menu-page">
      <div className="menu-page-heading">
        <div>
          <Typography.Title level={2}>Pengelolaan User</Typography.Title>
          <Typography.Text tone="secondary">Kelola role, section, dan status user Akura.</Typography.Text>
        </div>
      </div>

      <Card>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={users}
          scroll={{ x: 1100 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} user`,
          }}
        />
      </Card>

      <Modal
        title={`Edit user${editingUser ? `: ${editingUser.username}` : ''}`}
        visible={modalOpen}
        busy={saving}
        okText="Simpan"
        cancelText="Batal"
        onOk={saveUser}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Role wajib dipilih.' }]}>
            <Select options={ROLES.map((role) => ({ value: role, label: role }))} />
          </Form.Item>
          <Form.Item name="section" label="Section">
            <Select options={SECTION_OPTIONS} />
          </Form.Item>
          <Form.Item name="isActive" label="Status" valuePropName="checked">
            <Switch activeLabel="Aktif" inactiveLabel="Nonaktif" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

export default UserPage
