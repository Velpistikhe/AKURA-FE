import { useSaveConfirmation } from '../../components/global'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  DeleteOutlined,
  EditOutlined,
  Form,
  Input,
  Modal,
  PlusOutlined,
  Popconfirm,
  Space,
  Switch,
  Table,
  TableSearchFilter,
  Tag,
  Typography,
} from '../../components/global'
import { officeBranchService } from '../../services/officeBranchService'
import '../menu/MenuPage.css'

const DEFAULT_PAGE_SIZE = 20
const PHONE_PATTERN = /^[0-9+().\-\s]+$/

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function responseOfficeBranch(response) {
  return response.data?.officeBranch || response.data
}

function OfficeBranchPage() {
  const { message } = App.useApp()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [form] = Form.useForm()
  const [officeBranches, setOfficeBranches] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [headFilter, setHeadFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingOfficeBranch, setEditingOfficeBranch] = useState(null)
  const [isHead, setIsHead] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const requestIdRef = useRef(0)

  const loadOfficeBranches = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const response = await officeBranchService.list({
        page,
        limit: pageSize,
        search,
        isHead: headFilter,
        sortBy,
        sortOrder,
      })
      if (requestId !== requestIdRef.current) return
      setOfficeBranches(response.data?.officeBranches || [])
      setPagination(response.data?.pagination || { page, total: 0, totalPages: 1 })
    } catch (error) {
      if (requestId === requestIdRef.current) message.error(error.message)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [headFilter, message, page, pageSize, search, sortBy, sortOrder])

  useEffect(() => {
    const timeoutId = setTimeout(loadOfficeBranches, 300)
    return () => clearTimeout(timeoutId)
  }, [loadOfficeBranches])

  useEffect(() => {
    if (!modalOpen) return

    setIsHead(editingOfficeBranch?.isHead === true)
    form.resetFields()
    form.setFieldsValue(editingOfficeBranch ? {
      name: editingOfficeBranch.name,
      address: editingOfficeBranch.address,
      telp: editingOfficeBranch.telp,
      email: editingOfficeBranch.email,
    } : {
      name: '',
      address: '',
      telp: '',
      email: '',
    })
  }, [editingOfficeBranch, form, modalOpen])

  const openCreate = () => {
    setEditingOfficeBranch(null)
    setModalOpen(true)
  }

  const openEdit = async (officeBranch) => {
    setLoadingDetailId(officeBranch.id)
    try {
      const detail = responseOfficeBranch(await officeBranchService.get(officeBranch.id))
      if (!detail?.id) throw new Error('Invalid office branch detail data.')

      setEditingOfficeBranch(detail)
      setModalOpen(true)
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoadingDetailId(null)
    }
  }

  const saveOfficeBranch = async () => {
    const values = await form.validateFields()
    const payload = {
      name: values.name.trim(),
      address: values.address.trim(),
      telp: values.telp.trim(),
      email: values.email.trim(),
      isHead,
    }

    if (!await confirmSave('office branch')) return
    setSaving(true)
    try {
      if (editingOfficeBranch) {
        await officeBranchService.update(editingOfficeBranch.id, payload)
        message.success('Office branch updated successfully.')
      } else {
        await officeBranchService.create(payload)
        message.success('Office branch created successfully.')
      }
      setModalOpen(false)
      await loadOfficeBranches()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteOfficeBranch = async (officeBranch) => {
    try {
      await officeBranchService.remove(officeBranch.id)
      message.success('Office branch deleted successfully.')
      if (officeBranches.length === 1 && page > 1) setPage((current) => current - 1)
      else await loadOfficeBranches()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1)
    setHeadFilter(filters.isHead?.[0] || '')
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
          placeholder="Search branch details"
          onSearch={(value) => { setSearch(value); setPage(1) }}
        />
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      sorter: true,
      sortOrder: getSortOrder('address', sortBy, sortOrder),
    },
    {
      title: 'Phone',
      dataIndex: 'telp',
      key: 'telp',
      width: 170,
      sorter: true,
      sortOrder: getSortOrder('telp', sortBy, sortOrder),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: true,
      sortOrder: getSortOrder('email', sortBy, sortOrder),
    },
    {
      title: 'Type',
      dataIndex: 'isHead',
      key: 'isHead',
      width: 130,
      sorter: true,
      sortOrder: getSortOrder('isHead', sortBy, sortOrder),
      filters: [
        { text: 'Head Office', value: 'true' },
        { text: 'Branch Office', value: 'false' },
      ],
      filterMultiple: false,
      filteredValue: headFilter ? [headFilter] : null,
      render: (value) => <Tag color={value ? 'blue' : 'default'}>{value ? 'Head Office' : 'Branch Office'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, officeBranch) => (
        <Space>
          <Button
            variant="text"
            icon={<EditOutlined />}
            busy={loadingDetailId === officeBranch.id}
            onClick={() => openEdit(officeBranch)}
            aria-label={`Edit ${officeBranch.name}`}
          />
          <Popconfirm
            title="Delete office branch?"
            description="This office branch will be permanently deleted."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteOfficeBranch(officeBranch)}
          >
            <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label={`Delete ${officeBranch.name}`} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section className="menu-page">
      {saveConfirmation}
      <div className="menu-page-heading">
        <div>
          <Typography.Title level={2}>Office Branch Management</Typography.Title>
          <Typography.Text tone="secondary">Manage office locations and designate the head office.</Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Office Branch</Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={officeBranches}
          scroll={{ x: 1100 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} office branch`,
          }}
        />
      </Card>

      <Modal
        title={editingOfficeBranch ? 'Edit Office Branch' : 'Add Office Branch'}
        visible={modalOpen}
        busy={saving}
        okText={editingOfficeBranch ? 'Save' : 'Add'}
        cancelText="Cancel"
        onOk={saveOfficeBranch}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
        width={640}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required.' }, { max: 200 }]}>
            <Input placeholder="example: Jakarta Head Office" />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ required: true, message: 'Address is required.' }, { max: 500 }]}>
            <Input.TextArea rows={3} placeholder="Enter the complete office address" />
          </Form.Item>
          <Form.Item name="telp" label="Phone" rules={[
            { required: true, message: 'Phone number is required.' },
            { min: 3, max: 30 },
            { pattern: PHONE_PATTERN, message: 'Use numbers or the symbols + ( ) . - only.' },
          ]}>
            <Input placeholder="example: +62 21 555 0100" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[
            { required: true, message: 'Email is required.' },
            { type: 'email', message: 'Enter a valid email address.' },
            { max: 254 },
          ]}>
            <Input placeholder="example: jakarta@example.com" />
          </Form.Item>
          <Form.Item label="Office Type">
            <Switch checked={isHead} onChange={setIsHead} activeLabel="Head Office" inactiveLabel="Branch Office" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

export default OfficeBranchPage
