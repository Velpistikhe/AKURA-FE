import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  DeleteOutlined,
  Form,
  Input,
  Modal,
  PlusOutlined,
  Popconfirm,
  Select,
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
    form.resetFields()
    form.setFieldsValue({ name: '', title: 'mr' })
    setAddModalOpen(true)
  }

  const addStaff = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await companyStaffService.create({
        companyId: company.id,
        name: values.name.trim(),
        title: values.title,
      })
      message.success('Staff berhasil ditambahkan.')
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
      message.success('Staff berhasil dihapus.')
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
      title: 'Nama',
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
      title: 'Aksi',
      key: 'actions',
      width: 80,
      render: (_, staff) => (
        <Popconfirm
          title="Hapus staff?"
          okText="Hapus"
          cancelText="Batal"
          okButtonProps={{ danger: true }}
          onConfirm={() => deleteStaff(staff)}
        >
          <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label={`Hapus ${staff.name}`} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Modal
        title={`Staff Company: ${company?.name || ''}`}
        visible={visible}
        width={900}
        footer={null}
        onCancel={onClose}
        preRender
        unmountOnClose
      >
        <div className="staff-modal-action">
          <Button variant="primary" icon={<PlusOutlined />} onClick={openAdd}>Tambah staff</Button>
        </div>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={staffs}
          scroll={{ x: 700 }}
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
        title={`Tambah staff: ${company?.name || ''}`}
        visible={addModalOpen}
        busy={saving}
        okText="Tambah"
        cancelText="Batal"
        onOk={addStaff}
        onCancel={() => setAddModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Nama" rules={[{ required: true, whitespace: true, message: 'Nama wajib diisi.' }, { max: 200 }]}>
            <Input maxLength={200} placeholder="contoh: John Doe" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title wajib dipilih.' }]}>
            <Select options={TITLES} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default CompanyStaffModal
