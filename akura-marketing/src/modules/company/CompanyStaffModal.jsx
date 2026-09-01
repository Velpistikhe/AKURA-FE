import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  DeleteOutlined,
  EditOutlined,
  Form,
  Input,
  Modal,
  PlusOutlined,
  Popconfirm,
  Select,
  Space,
  Table,
  TableSearchFilter,
  Tag,
} from '../../components/global'
import { companyStaffService } from '../../services/companyStaffService'

const DEFAULT_PAGE_SIZE = 20
const TITLES = [
  { value: 'mr', label: 'Mr' },
  { value: 'mrs', label: 'Mrs' },
]

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function CompanyStaffModal({ company, visible, onClose, onChanged }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [staffs, setStaffs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [titleFilter, setTitleFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingStaff, setEditingStaff] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const requestIdRef = useRef(0)

  const loadStaffs = useCallback(async () => {
    if (!visible || !company?.id) return

    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const response = await companyStaffService.list({
        page,
        limit: pageSize,
        companyId: company.id,
        search,
        title: titleFilter,
        sortBy,
        sortOrder,
      })
      if (requestId !== requestIdRef.current) return
      setStaffs(response.data?.staffs || [])
      setPagination(response.data?.pagination || { page, total: 0, totalPages: 1 })
    } catch (error) {
      if (requestId === requestIdRef.current) message.error(error.message)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [company?.id, message, page, pageSize, search, sortBy, sortOrder, titleFilter, visible])

  useEffect(() => {
    const timeoutId = setTimeout(loadStaffs, 300)
    return () => clearTimeout(timeoutId)
  }, [loadStaffs])

  useEffect(() => {
    if (!visible) return
    setPage(1)
    setSearch('')
    setTitleFilter('')
    setSortBy('')
    setSortOrder('')
  }, [company?.id, visible])

  const openAdd = () => {
    setEditingStaff(null)
    form.resetFields()
    form.setFieldsValue({ name: '', title: 'mr', telp: '', email: '' })
    setAddModalOpen(true)
  }

  const openEdit = async (staff) => {
    setLoadingDetailId(staff.id)
    try {
      const response = await companyStaffService.get(staff.id)
      const detail = response.data?.staff || response.data
      if (!detail?.id) throw new Error('Invalid staff detail data.')

      setEditingStaff(detail)
      form.resetFields()
      form.setFieldsValue({
        name: detail.name,
        title: detail.title,
        telp: detail.telp || '',
        email: detail.email || '',
      })
      setAddModalOpen(true)
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoadingDetailId(null)
    }
  }

  const saveStaff = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        companyId: company.id,
        name: values.name.trim(),
        title: values.title,
        telp: values.telp?.trim() || null,
        email: values.email?.trim() || null,
      }

      if (editingStaff) {
        await companyStaffService.update(editingStaff.id, payload)
        message.success('Staff member updated successfully.')
      } else {
        await companyStaffService.create(payload)
        message.success('Staff member added successfully.')
      }
      setAddModalOpen(false)
      await loadStaffs()
      await onChanged?.()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteStaff = async (staff) => {
    try {
      await companyStaffService.remove(staff.id)
      message.success('Staff member deleted successfully.')
      if (staffs.length === 1 && page > 1) setPage((current) => current - 1)
      else await loadStaffs()
      await onChanged?.()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1)
    setTitleFilter(filters.title?.[0] || '')
    setSortBy(sorter.order ? sorter.field : '')
    setSortOrder(sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '')
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: getSortOrder('name', sortBy, sortOrder),
      filteredValue: search ? [search] : null,
      filterDropdown: (props) => (
        <TableSearchFilter
          {...props}
          onSearch={(value) => { setSearch(value); setPage(1) }}
        />
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 110,
      sorter: true,
      sortOrder: getSortOrder('title', sortBy, sortOrder),
      filters: TITLES.map((title) => ({ text: title.label, value: title.value })),
      filterMultiple: false,
      filteredValue: titleFilter ? [titleFilter] : null,
      render: (value) => <Tag color="blue">{value === 'mrs' ? 'Mrs' : 'Mr'}</Tag>,
    },
    {
      title: 'Phone',
      dataIndex: 'telp',
      key: 'telp',
      width: 150,
      render: (value) => value || '—',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 220,
      render: (value) => value || '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, staff) => (
        <Space>
          <Button
            variant="text"
            icon={<EditOutlined />}
            busy={loadingDetailId === staff.id}
            onClick={() => openEdit(staff)}
            aria-label={`Edit ${staff.name}`}
          />
          <Popconfirm
            title="Delete staff member?"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteStaff(staff)}
          >
            <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label={`Delete ${staff.name}`} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Modal
        title={`Company Staff: ${company?.name || ''}`}
        visible={visible}
        width={900}
        footer={null}
        onCancel={onClose}
        preRender
        unmountOnClose
      >
        <div className="staff-modal-action">
          <Button variant="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Staff</Button>
        </div>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={staffs}
          scroll={{ x: 950 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} staff`,
          }}
        />
      </Modal>

      <Modal
        title={`${editingStaff ? 'Edit' : 'Add'} Staff: ${company?.name || ''}`}
        visible={addModalOpen}
        busy={saving}
        okText={editingStaff ? 'Save' : 'Add'}
        cancelText="Cancel"
        onOk={saveStaff}
        onCancel={() => setAddModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: 'Name is required.' }, { max: 200 }]}>
            <Input maxLength={200} placeholder="example: John Doe" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required.' }]}>
            <Select options={TITLES} />
          </Form.Item>
          <Form.Item name="telp" label="Phone" rules={[{ max: 30, message: 'Phone must not exceed 30 characters.' }]}>
            <Input maxLength={30} placeholder="example: +62 812 3456 7890" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Enter a valid email address.' }, { max: 254 }]}>
            <Input maxLength={254} placeholder="example: john@example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default CompanyStaffModal
