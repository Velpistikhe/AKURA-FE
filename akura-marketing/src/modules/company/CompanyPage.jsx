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
import { companyService } from '../../services/companyService'
import CompanyStaffModal from './CompanyStaffModal'
import './CompanyPage.css'

const DEFAULT_PAGE_SIZE = 20

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function CompanyPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [companies, setCompanies] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingCompany, setEditingCompany] = useState(null)
  const [staffCompany, setStaffCompany] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const requestIdRef = useRef(0)

  const loadCompanies = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const response = await companyService.list({
        page,
        limit: pageSize,
        search,
        hasContract: contractFilter,
        sortBy,
        sortOrder,
      })
      if (requestId !== requestIdRef.current) return
      setCompanies(response.data?.companies || [])
      setPagination(response.data?.pagination || { page, total: 0, totalPages: 1 })
    } catch (error) {
      if (requestId === requestIdRef.current) message.error(error.message)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [contractFilter, message, page, pageSize, search, sortBy, sortOrder])

  useEffect(() => {
    const timeoutId = setTimeout(loadCompanies, 300)
    return () => clearTimeout(timeoutId)
  }, [loadCompanies])

  const openCreate = () => {
    setEditingCompany(null)
    form.resetFields()
    form.setFieldsValue({ name: '', address: '', hasContract: false })
    setModalOpen(true)
  }

  const openEdit = async (company) => {
    setLoadingDetailId(company.id)
    try {
      const response = await companyService.get(company.id)
      const detail = response.data?.company || response.data
      if (!detail?.id) throw new Error('Data detail company tidak valid.')

      setEditingCompany(detail)
      form.resetFields()
      form.setFieldsValue({
        name: detail.name,
        address: detail.address,
        hasContract: detail.hasContract,
      })
      setModalOpen(true)
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoadingDetailId(null)
    }
  }

  const saveCompany = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        name: values.name.trim(),
        address: values.address.trim(),
        hasContract: values.hasContract,
      }

      if (editingCompany) {
        await companyService.update(editingCompany.id, payload)
        message.success('Company berhasil diperbarui.')
      } else {
        await companyService.create(payload)
        message.success('Company berhasil dibuat.')
      }

      setModalOpen(false)
      await loadCompanies()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteCompany = async (company) => {
    try {
      await companyService.remove(company.id)
      message.success('Company berhasil dihapus.')
      if (companies.length === 1 && page > 1) setPage((current) => current - 1)
      else await loadCompanies()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1)
    setContractFilter(filters.hasContract?.[0] || '')
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
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Alamat',
      dataIndex: 'address',
      key: 'address',
      sorter: true,
      sortOrder: getSortOrder('address', sortBy, sortOrder),
    },
    {
      title: 'Kontrak',
      dataIndex: 'hasContract',
      key: 'hasContract',
      width: 120,
      sorter: true,
      sortOrder: getSortOrder('hasContract', sortBy, sortOrder),
      filters: [
        { text: 'Memiliki kontrak', value: 'true' },
        { text: 'Tanpa kontrak', value: 'false' },
      ],
      filterMultiple: false,
      filteredValue: contractFilter ? [contractFilter] : null,
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Ada' : 'Tidak ada'}</Tag>,
    },
    {
      title: 'Jumlah Staff',
      key: 'staffCount',
      width: 130,
      render: (_, company) => (
        <Button variant="link" onClick={() => setStaffCompany(company)}>
          {company._count?.staffs ?? 0} staff
        </Button>
      ),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, company) => (
        <Space>
          <Button
            variant="text"
            icon={<EditOutlined />}
            busy={loadingDetailId === company.id}
            onClick={() => openEdit(company)}
            aria-label={`Edit ${company.name}`}
          />
          <Popconfirm
            title="Hapus company?"
            description="Data company yang dihapus tidak dapat dikembalikan."
            okText="Hapus"
            cancelText="Batal"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteCompany(company)}
          >
            <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label={`Hapus ${company.name}`} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section className="company-page">
      <div className="company-page-heading">
        <div>
          <Typography.Title level={2}>Pengelolaan Company</Typography.Title>
          <Typography.Text tone="secondary">Kelola company pada layanan Marketing Akura.</Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>Tambah company</Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={companies}
          scroll={{ x: 1000 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} company`,
          }}
        />
      </Card>

      <Modal
        title={editingCompany ? 'Edit company' : 'Tambah company'}
        visible={modalOpen}
        busy={saving}
        okText={editingCompany ? 'Simpan' : 'Tambah'}
        cancelText="Batal"
        onOk={saveCompany}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Nama" rules={[{ required: true, whitespace: true, message: 'Nama wajib diisi.' }, { max: 200 }]}>
            <Input maxLength={200} placeholder="contoh: PT Akura Indonesia" />
          </Form.Item>
          <Form.Item name="address" label="Alamat" rules={[{ required: true, whitespace: true, message: 'Alamat wajib diisi.' }, { max: 500 }]}>
            <Input.TextArea maxLength={500} rows={4} placeholder="contoh: Jakarta" showCount />
          </Form.Item>
          <Form.Item name="hasContract" label="Kontrak" valuePropName="checked">
            <Switch activeLabel="Ada" inactiveLabel="Tidak ada" />
          </Form.Item>
        </Form>
      </Modal>

      <CompanyStaffModal
        company={staffCompany}
        visible={Boolean(staffCompany)}
        onClose={() => setStaffCompany(null)}
        onChanged={loadCompanies}
      />
    </section>
  )
}

export default CompanyPage
