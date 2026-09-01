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
    form.setFieldsValue({ name: '', type: '', address: '', hasContract: false })
    setModalOpen(true)
  }

  const openEdit = async (company) => {
    setLoadingDetailId(company.id)
    try {
      const response = await companyService.get(company.id)
      const detail = response.data?.company || response.data
      if (!detail?.id) throw new Error('Invalid company detail data.')

      setEditingCompany(detail)
      form.resetFields()
      form.setFieldsValue({
        name: detail.name,
        type: detail.type,
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
        type: values.type.trim(),
        address: values.address.trim(),
        hasContract: values.hasContract,
      }

      if (editingCompany) {
        await companyService.update(editingCompany.id, payload)
        message.success('Company updated successfully.')
      } else {
        await companyService.create(payload)
        message.success('Company created successfully.')
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
      message.success('Company deleted successfully.')
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
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      sorter: true,
      sortOrder: getSortOrder('type', sortBy, sortOrder),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      sorter: true,
      sortOrder: getSortOrder('address', sortBy, sortOrder),
    },
    {
      title: 'Contract',
      dataIndex: 'hasContract',
      key: 'hasContract',
      width: 120,
      sorter: true,
      sortOrder: getSortOrder('hasContract', sortBy, sortOrder),
      filters: [
        { text: 'Has contract', value: 'true' },
        { text: 'No contract', value: 'false' },
      ],
      filterMultiple: false,
      filteredValue: contractFilter ? [contractFilter] : null,
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Staff Count',
      key: 'staffCount',
      width: 130,
      render: (_, company) => (
        <Button variant="link" onClick={() => setStaffCompany(company)}>
          {company._count?.staffs ?? 0} staff
        </Button>
      ),
    },
    {
      title: 'Actions',
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
            title="Delete company?"
            description="Deleted company data cannot be restored."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteCompany(company)}
          >
            <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label={`Delete ${company.name}`} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section className="company-page">
      <div className="company-page-heading">
        <div>
          <Typography.Title level={2}>Company Management</Typography.Title>
          <Typography.Text tone="secondary">Manage companies in the Akura Marketing service.</Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Company</Button>
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
        title={editingCompany ? 'Edit Company' : 'Add Company'}
        visible={modalOpen}
        busy={saving}
        okText={editingCompany ? 'Save' : 'Add'}
        cancelText="Cancel"
        onOk={saveCompany}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: 'Name is required.' }, { max: 200 }]}>
            <Input maxLength={200} placeholder="example: PT Akura Indonesia" />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true, whitespace: true, message: 'Company type is required.' }, { max: 100 }]}>
            <Input maxLength={100} placeholder="example: Customer" />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ required: true, whitespace: true, message: 'Address is required.' }, { max: 500 }]}>
            <Input.TextArea maxLength={500} rows={4} placeholder="example: Jakarta" showCount />
          </Form.Item>
          <Form.Item name="hasContract" label="Contract" valuePropName="checked">
            <Switch activeLabel="Yes" inactiveLabel="No" />
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
