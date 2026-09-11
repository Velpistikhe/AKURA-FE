import { useSaveConfirmation } from '../../components/global'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { officeBranchService } from '../../services/officeBranchService'
import '../menu/MenuPage.css'

const DEFAULT_PAGE_SIZE = 20
const ROLES = ['USER', 'ADMIN', 'APP_MANAGER']
const SECTIONS = ['ACCOUNTING', 'HRD_MANAGEMENT', 'MARKETING', 'FIELD_SERVICE']
const SECTION_OPTIONS = [
  { value: 'ALL', label: 'No section' },
  ...SECTIONS.map((section) => ({ value: section, label: section })),
]
const NO_OFFICE_BRANCH = 'NONE'

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function responseUser(response) {
  return response.data?.user || response.data
}

function UserPage() {
  const { message } = App.useApp()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [form] = Form.useForm()
  const [users, setUsers] = useState([])
  const [officeBranches, setOfficeBranches] = useState([])
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
  const [loadingOfficeBranches, setLoadingOfficeBranches] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [userIsActive, setUserIsActive] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const requestIdRef = useRef(0)

  const officeBranchOptions = useMemo(() => [
    { value: NO_OFFICE_BRANCH, label: 'No office branch' },
    ...officeBranches.map((branch) => ({ value: branch.id, label: branch.name })),
  ], [officeBranches])

  const officeBranchById = useMemo(
    () => new Map(officeBranches.map((branch) => [branch.id, branch.name])),
    [officeBranches],
  )

  const loadOfficeBranches = useCallback(async () => {
    setLoadingOfficeBranches(true)
    try {
      const response = await officeBranchService.options()
      setOfficeBranches(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoadingOfficeBranches(false)
    }
  }, [message])

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
    loadOfficeBranches()
  }, [loadOfficeBranches])

  useEffect(() => {
    const timeoutId = setTimeout(loadUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [loadUsers])

  useEffect(() => {
    if (!modalOpen || !editingUser) return

    setUserIsActive(editingUser.isActive === true)
    form.resetFields()
    form.setFieldsValue({
      role: editingUser.role,
      section: editingUser.section || 'ALL',
      officeBranchId: editingUser.officeBranchId || NO_OFFICE_BRANCH,
    })
  }, [editingUser, form, modalOpen])

  const openEdit = async (user) => {
    setLoadingDetailId(user.id)
    try {
      const detail = responseUser(await userService.get(user.id))
      if (!detail?.id) throw new Error('Invalid user detail data.')

      setEditingUser(detail)
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
      const changes = {}

      if (values.role !== editingUser.role) {
        changes.role = values.role
      }

      const nextSection = values.section === 'ALL' ? null : values.section
      if (nextSection !== editingUser.section) {
        changes.section = nextSection
      }

      const nextOfficeBranchId = values.officeBranchId === NO_OFFICE_BRANCH ? null : values.officeBranchId
      if (nextOfficeBranchId !== editingUser.officeBranchId) {
        changes.officeBranchId = nextOfficeBranchId
      }

      if (userIsActive !== editingUser.isActive) {
        changes.isActive = userIsActive
      }

      const changed = Object.keys(changes).length > 0
      if (!changed) {
        message.warning('No changes were made.')
        return
      }
      if (!await confirmSave('user')) return
      if (changed) {
        await userService.update(editingUser.id, {
          ...changes,
          version: editingUser.version,
        })
      }

      message.success('User updated successfully.')
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
          placeholder="Search username or name"
          onSearch={(value) => { setSearch(value); setPage(1) }}
        />
      ),
      render: (value) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: 'Name',
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
      render: (value) => value || 'No section',
    },
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
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Office Branch',
      dataIndex: 'officeBranchId',
      key: 'officeBranchId',
      render: (value) => value ? officeBranchById.get(value) || value : 'No office branch',
    },
    {
      title: 'Actions',
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
      {saveConfirmation}
      <div className="menu-page-heading">
        <div>
          <Typography.Title level={2}>User Management</Typography.Title>
          <Typography.Text tone="secondary">Manage Akura user roles, sections, office branches, and statuses.</Typography.Text>
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
        title={`Edit User${editingUser ? `: ${editingUser.username}` : ''}`}
        visible={modalOpen}
        busy={saving}
        okText="Save"
        cancelText="Cancel"
        onOk={saveUser}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Role is required.' }]}>
            <Select options={ROLES.map((role) => ({ value: role, label: role }))} />
          </Form.Item>
          <Form.Item name="section" label="Section">
            <Select options={SECTION_OPTIONS} />
          </Form.Item>
          <Form.Item name="officeBranchId" label="Office Branch">
            <Select
              showSearch
              optionFilterProp="label"
              loading={loadingOfficeBranches}
              options={officeBranchOptions}
              placeholder="Select office branch"
            />
          </Form.Item>
          <Form.Item label="Status">
            <Switch checked={userIsActive} onChange={setUserIsActive} activeLabel="Active" inactiveLabel="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

export default UserPage
