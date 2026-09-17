import { useCallback, useEffect, useState } from 'react'
import { App, Button, DeleteOutlined, EditOutlined, EyeOutlined, Form, Input, Modal, Table, TableSearchFilter, Tag, Typography, UploadOutlined, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import CompanyContractUpload from './CompanyContractUpload'
import PendingContracts from './PendingContracts'
import { canAdministerContracts } from './contractAccess'

function formatContractDate(value) {
  return value ? String(value).slice(0, 10) : '-'
}

export default function CompanyContractSection({ company, currentUser, onChanged, historyOnly = false }) {
  const readOnly = company.revoked === true
  const canAdminister = !readOnly && canAdministerContracts(currentUser)
  const [pendingRevision, setPendingRevision] = useState(0)
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [terminationForm] = Form.useForm()
  const [confirmSave, confirmation] = useSaveConfirmation()
  const [contracts, setContracts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [historyPage, setHistoryPage] = useState(1)
  const [historyLimit, setHistoryLimit] = useState(20)
  const [historyStatus, setHistoryStatus] = useState('')
  const [historyActive, setHistoryActive] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [terminating, setTerminating] = useState(false)
  const [terminationContract, setTerminationContract] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [uploadContract, setUploadContract] = useState(null)
  const [priceListContract, setPriceListContract] = useState(null)
  const [priceList, setPriceList] = useState({ prices: [], pagination: { total: 0 } })
  const [priceListLoading, setPriceListLoading] = useState(false)
  const [pricePage, setPricePage] = useState(1)
  const [priceQuery, setPriceQuery] = useState({ search: '', isActive: '', sortBy: '', sortOrder: '' })
  const [contractHistoryVisible, setContractHistoryVisible] = useState(false)

  const loadContracts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await contractService.list({ companyId: company.id, page: historyPage, limit: historyLimit, status: historyStatus, isActive: historyActive })
      setContracts(response.data?.contracts || [])
      setPagination(response.data?.pagination || { page: historyPage, total: 0, totalPages: 1 })
    } catch (error) {
      setContracts([])
      message.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [company.id, historyActive, historyLimit, historyPage, historyStatus, message])

  useEffect(() => {
    if (contractHistoryVisible) loadContracts()
  }, [contractHistoryVisible, loadContracts])

  useEffect(() => {
    if (!priceListContract) return
    let active = true
    setPriceListLoading(true)
    setPriceList({ prices: [], pagination: { total: 0 } })
    contractService.listPrices({ contractId: priceListContract.id, page: pricePage, limit: 20, ...priceQuery }).then((response) => {
      if (active) setPriceList(response.data || { prices: [], pagination: { total: 0 } })
    }).catch((error) => { if (active) message.error(error.message) }).finally(() => { if (active) setPriceListLoading(false) })
    return () => { active = false }
  }, [message, priceListContract, pricePage, priceQuery])

  const refreshCompanyDetail = async () => {
    setPendingRevision((value) => value + 1)
    if (contractHistoryVisible) await loadContracts()
    await onChanged?.()
  }

  const openCreate = () => {
    if (readOnly) return
    form.resetFields()
    form.setFieldsValue({ contractNumber: '', contractDate: '', effectiveFrom: '', effectiveUntil: '' })
    setCreateOpen(true)
  }

  const openUpdate = (contract) => {
    if (!canAdminister || contract.isActive === false) return
    form.resetFields()
    form.setFieldsValue({
      contractNumber: contract.contractNumber,
      contractDate: formatContractDate(contract.contractDate),
      effectiveFrom: formatContractDate(contract.effectiveFrom),
      effectiveUntil: formatContractDate(contract.effectiveUntil),
    })
    setEditingContract(contract)
  }

  const createContract = async () => {
    if (readOnly) return
    const values = await form.validateFields()
    const effectiveFrom = new Date(values.effectiveFrom)
    const effectiveUntil = new Date(values.effectiveUntil)
    if (effectiveUntil <= effectiveFrom) {
      form.setFields([{ name: 'effectiveUntil', errors: ['End date must be after the start date.'] }])
      return
    }
    if (!await confirmSave('company contract')) return
    setSaving(true)
    try {
      await contractService.create({
        companyId: company.id,
        contractNumber: values.contractNumber.trim(),
        contractDate: values.contractDate,
        effectiveFrom: values.effectiveFrom,
        effectiveUntil: values.effectiveUntil,
      })
      message.success('Contract created successfully.')
      setCreateOpen(false)
      await refreshCompanyDetail()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const updateContract = async () => {
    if (!canAdminister || editingContract?.isActive === false) return
    const values = await form.validateFields()
    if (new Date(values.effectiveUntil) <= new Date(values.effectiveFrom)) {
      form.setFields([{ name: 'effectiveUntil', errors: ['End date must be after the start date.'] }])
      return
    }
    if (!await confirmSave('company contract revision')) return
    setSaving(true)
    try {
      await contractService.update(editingContract.id, {
        version: editingContract.version,
        contractNumber: values.contractNumber.trim(),
        contractDate: values.contractDate,
        effectiveFrom: values.effectiveFrom,
        effectiveUntil: values.effectiveUntil,
      })
      message.success('Contract updated successfully.')
      setEditingContract(null)
      await refreshCompanyDetail()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const terminateContract = async () => {
    if (!canAdminister || terminationContract?.isActive === false) return
    const { terminatedAt } = await terminationForm.validateFields()
    const contract = terminationContract
    if (terminatedAt <= formatContractDate(contract.effectiveFrom)) {
      terminationForm.setFields([{ name: 'terminatedAt', errors: ['Termination date must be after the start date.'] }])
      return
    }
    if (!await confirmSave('contract termination')) return
    setTerminating(true)
    try {
      await contractService.remove(contract.id, contract.version, terminatedAt)
      message.success('Contract terminated successfully.')
      setTerminationContract(null)
      await refreshCompanyDetail()
    } catch (error) {
      message.error(error.message)
      if (error.status === 409) {
        setTerminationContract(null)
        await refreshCompanyDetail()
      }
    } finally {
      setTerminating(false)
    }
  }

  const activeContract = company.contract || null

  const historySection = <section className="company-view-section company-contract-history-section">
    <div className="company-view-section-heading">
      <div><h3>Contract History</h3><Typography.Text tone="secondary">All contracts ever created for this company.</Typography.Text></div>
      <Button variant="link" onClick={() => setContractHistoryVisible((visible) => !visible)}>{contractHistoryVisible ? 'Hide History' : 'Show History'}</Button>
    </div>
    <div className={`company-contract-history-content${contractHistoryVisible ? ' is-visible' : ''}`} aria-hidden={!contractHistoryVisible}>
      <div className="company-contract-history-content-inner">
        <Table rowKey="id" loading={loading} dataSource={contracts} scroll={{ x: 1000 }}
          columns={[
            { title: 'Contract Number', dataIndex: 'contractNumber' },
            { title: 'Contract Date', dataIndex: 'contractDate', render: formatContractDate },
            { title: 'Effective From', dataIndex: 'effectiveFrom', render: formatContractDate },
            { title: 'Effective Until', dataIndex: 'effectiveUntil', render: formatContractDate },
            { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag>,
              filters: ['CREATE', 'ACTIVE', 'EXPIRED', 'TERMINATED'].map((value) => ({ text: value, value })),
              filterMultiple: false, filteredValue: historyStatus ? [historyStatus] : null },
            { title: 'Activity', dataIndex: 'isActive', render: (value) => <Tag>{value ? 'Active' : 'Inactive'}</Tag>,
              filters: [{ text: 'Active', value: 'true' }, { text: 'Inactive', value: 'false' }],
              filterMultiple: false, filteredValue: historyActive ? [historyActive] : null },
          ]}
          onChange={(_, filters, _sorter, extra) => {
            if (extra.action !== 'filter') return
            setHistoryStatus(filters.status?.[0] || '')
            setHistoryActive(filters.isActive?.[0] || '')
            setHistoryPage(1)
          }}
          pagination={{ current: historyPage, pageSize: historyLimit, total: pagination.total || 0,
            showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100],
            onChange: (page, limit) => { setHistoryPage(limit !== historyLimit ? 1 : page); setHistoryLimit(limit) } }} />
      </div>
    </div>
  </section>

  if (historyOnly) return historySection

  return <>
    <section className="company-view-section company-contract-section">
    {confirmation}
    <div className="company-view-section-heading">
      <div><h3>{activeContract ? 'Active Contract' : 'Contracts'}</h3>{activeContract && <Typography.Text tone="secondary">The current active contract returned by the company-detail endpoint.</Typography.Text>}</div>
      <div className="company-contract-actions">
        {!readOnly && <Button variant="primary" onClick={openCreate}>Add Contract</Button>}
      </div>
    </div>
    {activeContract ? <div className="company-contract-list">
      <div className="company-contract-card">
        <Tag color="success">{activeContract.status}</Tag>
        <div><span>Contract number</span><strong>{activeContract.contractNumber || '-'}</strong></div>
        <div><span>Contract date</span><strong>{formatContractDate(activeContract.contractDate)}</strong></div>
        <div><span>Effective from</span><strong>{formatContractDate(activeContract.effectiveFrom)}</strong></div>
        <div><span>Effective until</span><strong>{formatContractDate(activeContract.effectiveUntil)}</strong></div>
        <div className="company-contract-row-actions">
          {activeContract.hasList && <Button variant="text" icon={<EyeOutlined />} title="View Price List" onClick={() => { setPricePage(1); setPriceListContract(activeContract) }} />}
          {!readOnly && activeContract.isActive !== false && <Button variant="text" icon={<UploadOutlined />} title="Upload Price List" onClick={() => setUploadContract(activeContract)} />}
          {canAdminister && activeContract.isActive !== false && <Button variant="text" icon={<EditOutlined />} title="Update Contract" onClick={() => openUpdate(activeContract)} />}
          {canAdminister && activeContract.isActive !== false && <Button variant="text" isDanger icon={<DeleteOutlined />} title="Terminate Contract" onClick={() => { terminationForm.resetFields(); setTerminationContract(activeContract) }} />}
        </div>
      </div>
    </div> : null}

    <Modal title={`Add Contract: ${company.name}`} visible={createOpen} busy={saving} okText="Create" onOk={createContract}
      onCancel={() => { if (!saving) setCreateOpen(false) }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }} cancelButtonProps={{ disabled: saving }} unmountOnClose>
      <Form form={form} layout="vertical" preserve={false}>
        <Typography.Text tone="secondary">This contract will be created for {company.name}. All contract dates use the YYYY-MM-DD format.</Typography.Text>
        <Form.Item name="contractNumber" label="Contract Number" rules={[{ required: true, whitespace: true, message: 'Contract number is required.' }, { max: 255 }]}>
          <Input maxLength={255} placeholder="example: KONTRAK/AKR/001/2026" />
        </Form.Item>
        <Form.Item name="contractDate" label="Contract Date" rules={[{ required: true, message: 'Contract date is required.' }]}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="effectiveFrom" label="Effective From" rules={[{ required: true, message: 'Start date is required.' }]}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="effectiveUntil" label="Effective Until" rules={[{ required: true, message: 'End date is required.' }]}>
          <Input type="date" />
        </Form.Item>
      </Form>
    </Modal>
    <Modal title={`Update Contract: ${company.name}`} visible={Boolean(editingContract)} busy={saving} okText="Update" onOk={updateContract}
      onCancel={() => { if (!saving) setEditingContract(null) }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }} cancelButtonProps={{ disabled: saving }} unmountOnClose>
      <Form form={form} layout="vertical" preserve={false}>
        <Typography.Text tone="secondary">Updating creates an ACTIVE replacement and terminates the previous contract, as defined by the API.</Typography.Text>
        <Form.Item name="contractNumber" label="Contract Number" rules={[{ required: true, whitespace: true, message: 'Contract number is required.' }, { max: 255 }]}><Input maxLength={255} /></Form.Item>
        <Form.Item name="contractDate" label="Contract Date" rules={[{ required: true, message: 'Contract date is required.' }]}><Input type="date" /></Form.Item>
        <Form.Item name="effectiveFrom" label="Effective From" rules={[{ required: true, message: 'Start date is required.' }]}><Input type="date" /></Form.Item>
        <Form.Item name="effectiveUntil" label="Effective Until" rules={[{ required: true, message: 'End date is required.' }]}><Input type="date" /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Terminate Contract" visible={Boolean(terminationContract)} busy={terminating} okText="Terminate" okButtonProps={{ danger: true }}
      onOk={terminateContract} onCancel={() => { if (!terminating) setTerminationContract(null) }} unmountOnClose>
      <Form form={terminationForm} layout="vertical" preserve={false}>
        <Form.Item name="terminatedAt" label="Termination Date" rules={[{ required: true, message: 'Termination date is required.' }]}><Input type="date" /></Form.Item>
      </Form>
    </Modal>
    <Modal title={`Price List: ${priceListContract?.contractNumber || ''}`} visible={Boolean(priceListContract)} footer={null} width={1000} onCancel={() => setPriceListContract(null)} unmountOnClose>
      <Table rowKey="id" busy={priceListLoading} dataSource={priceList.prices || []} scroll={{ x: 850 }} pagination={{ current: pricePage, total: priceList.pagination?.total || 0, pageSize: 20, showSizeChanger: false, onChange: setPricePage, hideOnSinglePage: true }}
        onChange={(_, filters, sorter, extra) => {
          if (extra.action === 'paginate') return
          setPricePage(1)
          setPriceQuery({ search: (filters.search?.[0] || '').trim(), isActive: filters.isActive?.[0] || '',
            sortBy: sorter.order ? sorter.field : '', sortOrder: sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '' })
        }}
        columns={[
          { title: 'Service', render: (_, row) => row.catalogSnapshot?.serviceName || '-' },
          { title: 'Item', key: 'search', filteredValue: priceQuery.search ? [priceQuery.search] : null,
            filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search item or size" maxLength={200} />,
            render: (_, row) => row.catalogSnapshot?.itemName || '-' },
          { title: 'Size', render: (_, row) => row.catalogSnapshot?.size || '-' },
          { title: 'Service Price', dataIndex: 'priceService', sorter: true,
            sortOrder: priceQuery.sortBy === 'priceService' ? (priceQuery.sortOrder === 'asc' ? 'ascend' : 'descend') : null, render: (value) => value ?? '-' },
          { title: 'Maintenance Price', dataIndex: 'priceMaintenance', sorter: true,
            sortOrder: priceQuery.sortBy === 'priceMaintenance' ? (priceQuery.sortOrder === 'asc' ? 'ascend' : 'descend') : null, render: (value) => value ?? '-' },
          { title: 'Status', dataIndex: 'isActive', filterMultiple: false, filteredValue: priceQuery.isActive ? [priceQuery.isActive] : null,
            filters: [{ text: 'Active', value: 'true' }, { text: 'Inactive', value: 'false' }],
            render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag> },
        ]} />
    </Modal>
    <PendingContracts readOnly={readOnly} companyId={company.id} currentUser={currentUser} revision={pendingRevision} onChanged={refreshCompanyDetail} onUpload={setUploadContract} />
    {!readOnly && uploadContract && uploadContract.isActive !== false && <CompanyContractUpload company={company} contract={uploadContract} onClose={() => setUploadContract(null)} onChanged={refreshCompanyDetail} />}
    </section>
  </>
}
