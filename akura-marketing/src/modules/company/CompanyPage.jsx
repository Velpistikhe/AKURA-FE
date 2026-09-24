import { useSaveConfirmation } from '../../components/global'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  EyeOutlined,
  HistoryOutlined,
  Form,
  Input,
  Modal,
  PlusOutlined,
  Select,
  Space,
  Switch,
  Table,
  TableSearchFilter,
  Tag,
  Typography,
} from '../../components/global'
import { companyService } from '../../services/companyService'
import CompanyView from './CompanyView'
import CompanyHistoryModal from './CompanyHistoryModal'
import './CompanyPage.css'

const DEFAULT_PAGE_SIZE = 20
const COMPANY_TYPES = ['PT', 'CV', 'FIRMA', 'KOPERASI', 'PERORANGAN']
const COMPANY_TYPE_OPTIONS = COMPANY_TYPES.map((type) => ({ value: type, label: type }))

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function CompanyPage({ currentUser }) {
  const { message } = App.useApp()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [form] = Form.useForm()
  const [companies, setCompanies] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [sisterCompanyFilter, setSisterCompanyFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingCompany, setEditingCompany] = useState(null)
  const [viewCompany, setViewCompany] = useState(null)
  const [historyCompany, setHistoryCompany] = useState(null)
  const viewRequestRef = useRef(0)
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
        isSisterCompany: sisterCompanyFilter,
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
  }, [sisterCompanyFilter, message, page, pageSize, search, sortBy, sortOrder])

  useEffect(() => {
    const timeoutId = setTimeout(loadCompanies, 300)
    return () => clearTimeout(timeoutId)
  }, [loadCompanies])

  const openCreate = () => {
    setEditingCompany(null)
    form.resetFields()
    form.setFieldsValue({ name: '', type: undefined, address: '', npwp: '', isSisterCompany: false })
    setModalOpen(true)
  }

  const openView = async (company) => {
    const requestId = ++viewRequestRef.current
    setLoadingDetailId(company.id)
    try {
      const response = await companyService.get(company.id)
      if (requestId !== viewRequestRef.current) return
      if (!response.data?.id) throw new Error('Invalid company detail data.')
      setViewCompany(response.data)
    } catch (error) {
      if (requestId === viewRequestRef.current) message.error(error.message)
    } finally {
      if (requestId === viewRequestRef.current) setLoadingDetailId(null)
    }
  }

  const refreshView = async () => {
    if (viewCompany) await openView(viewCompany)
    await loadCompanies()
  }

  const openEdit = async (company) => {
    if (company.revoked === true) return
    setLoadingDetailId(company.id)
    try {
      const response = await companyService.get(company.id)
      const detail = response.data?.company || response.data
      if (!detail?.id) throw new Error('Invalid company detail data.')
      if (detail.revoked === true) { setViewCompany(detail); return }

      setEditingCompany(detail)
      form.resetFields()
      form.setFieldsValue({
        name: detail.name,
        type: detail.type,
        address: detail.address,
        npwp: detail.npwp,
        isSisterCompany: Boolean(detail.isSisterCompany),
      })
      setModalOpen(true)
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoadingDetailId(null)
    }
  }

  const saveCompany = async () => {
    if (editingCompany?.revoked === true) return
    const currentValues = form.getFieldsValue(true)
    if (editingCompany
      && (currentValues.name || '').trim() === (editingCompany.name || '').trim()
      && currentValues.type === editingCompany.type
      && (currentValues.address || '').trim() === (editingCompany.address || '').trim()
      && (currentValues.npwp || '').trim() === (editingCompany.npwp || '').trim()
      && Boolean(currentValues.isSisterCompany) === Boolean(editingCompany.isSisterCompany)) {
      message.warning('No changes were made.')
      return
    }

    const values = await form.validateFields()
    if (!await confirmSave('company')) return
    setSaving(true)
    try {
      const payload = {
        name: values.name.trim(),
        type: values.type,
        address: values.address.trim(),
        npwp: values.npwp.trim(),
        isSisterCompany: Boolean(values.isSisterCompany),
      }

      if (editingCompany) {
        const response = await companyService.update(editingCompany.id, {
          ...Object.fromEntries(Object.entries(payload).filter(([key, value]) => value !== editingCompany[key])),
          version: editingCompany.version,
        })
        // Refresh the profile while retaining the company's stable ID.
        setViewCompany((current) => current?.id === editingCompany.id ? response.data : current)
        message.success('Company updated successfully.')
      } else {
        await companyService.create(payload)
        message.success('Company created successfully.')
      }

      setModalOpen(false)
      await loadCompanies()
    } catch (error) {
      message.error(error.message)
      if (error.status === 409) {
        message.warning('Review the latest company data before reopening Edit and trying again.')
        await loadCompanies()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1)
    setSisterCompanyFilter(filters.isSisterCompany?.[0] || '')
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
      title: 'Sister Company',
      dataIndex: 'isSisterCompany',
      key: 'isSisterCompany',
      width: 120,
      sorter: true,
      sortOrder: getSortOrder('isSisterCompany', sortBy, sortOrder),
      filters: [
        { text: 'Sister company', value: 'true' },
        { text: 'Non-sister company', value: 'false' },
      ],
      filterMultiple: false,
      filteredValue: sisterCompanyFilter ? [sisterCompanyFilter] : null,
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Current Contract',
      dataIndex: 'contract',
      key: 'contract',
      width: 150,
      render: (contract) => <Tag color={contract ? 'success' : 'default'}>{contract ? contract.status : 'No active contract'}</Tag>,
    },
    {
      title: 'Staff Count',
      key: 'staffCount',
      width: 130,
      render: (_, company) => (
        <Button variant="link" onClick={() => openView(company)}>
          {company._count?.staffs ?? 0} staff
        </Button>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, company) => (
        <Space>
          {company.revoked !== true && <Button variant="text" icon={<HistoryOutlined />} title="View Company History" onClick={() => setHistoryCompany(company)} />}
          <Button
            variant="text"
            icon={<EyeOutlined />}
            busy={loadingDetailId === company.id}
            onClick={() => openView(company)}
            title="View Company"
          />
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

      {historyCompany && <CompanyHistoryModal record={historyCompany} onClose={() => setHistoryCompany(null)} />}

      {viewCompany && <CompanyView company={viewCompany} currentUser={currentUser}
        editing={modalOpen || loadingDetailId === viewCompany.id}
        onClose={() => { viewRequestRef.current++; setViewCompany(null) }}
        onEdit={openEdit} onChanged={refreshView} />}

      <Modal
        title={editingCompany ? 'Edit Company' : 'Add Company'}
        zIndex={1200}
        visible={modalOpen}
        busy={saving}
        okText={editingCompany ? 'Save' : 'Add'}
        cancelText="Cancel"
        onOk={saveCompany}
        onCancel={() => { if (!saving) setModalOpen(false) }}
        mask={{ closable: !saving }}
        keyboard={!saving}
        closable={!saving}
        cancelButtonProps={{ disabled: saving }}
        preRender
        unmountOnClose
      >
        {saveConfirmation}
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="type" label="Type" rules={[
            { required: true, message: 'Company type is required.' },
            { type: 'enum', enum: COMPANY_TYPES, message: 'Select a valid company type.' },
          ]}>
            <Select options={COMPANY_TYPE_OPTIONS} placeholder="Select company type" />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: 'Name is required.' }, { max: 200 }]}>
            <Input maxLength={200} placeholder="example: PT Akura Indonesia" />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ required: true, whitespace: true, message: 'Address is required.' }, { max: 500 }]}>
            <Input.TextArea maxLength={500} rows={4} placeholder="example: Jakarta" showCount />
          </Form.Item>
          <Form.Item name="npwp" label="NPWP" rules={[
            { required: true, whitespace: true, message: 'NPWP is required.' },
            { max: 32, message: 'NPWP must not exceed 32 characters.' },
          ]}>
            <Input maxLength={32} placeholder="example: 0012345678901234" />
          </Form.Item>
          <Form.Item name="isSisterCompany" label="Sister Company" valuePropName="checked">
            <Switch activeLabel="Yes" inactiveLabel="No" />
          </Form.Item>
        </Form>
      </Modal>

    </section>
  )
}

export default CompanyPage
