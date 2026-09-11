import { useCallback, useEffect, useState } from 'react'
import { App, Button, DeleteOutlined, EditOutlined, EyeOutlined, Form, Input, Modal, Popconfirm, Select, Table, Tag, Typography, UploadOutlined, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import CompanyContractUpload from './CompanyContractUpload'

function formatContractDate(value) {
  return value ? String(value).slice(0, 10) : '-'
}

export default function CompanyContractSection({ company, onChanged, historyOnly = false }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
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
  const [createOpen, setCreateOpen] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [uploadContract, setUploadContract] = useState(null)
  const [priceListContract, setPriceListContract] = useState(null)
  const [priceList, setPriceList] = useState({ prices: [], pagination: { total: 0 } })
  const [priceListLoading, setPriceListLoading] = useState(false)
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
    contractService.listPrices({ contractId: priceListContract.id, page: 1, limit: 100 }).then((response) => {
      if (active) setPriceList(response.data || { prices: [], pagination: { total: 0 } })
    }).catch((error) => { if (active) message.error(error.message) }).finally(() => { if (active) setPriceListLoading(false) })
    return () => { active = false }
  }, [message, priceListContract])

  const refreshCompanyDetail = async () => {
    if (contractHistoryVisible) await loadContracts()
    await onChanged?.()
  }

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ contractNumber: '', contractDate: '', effectiveFrom: '', effectiveUntil: '' })
    setCreateOpen(true)
  }

  const openUpdate = (contract) => {
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

  const terminateContract = async (contract) => {
    if (!await confirmSave('contract termination')) return
    setTerminating(true)
    try {
      await contractService.remove(contract.id, contract.version)
      message.success('Contract terminated successfully.')
      await refreshCompanyDetail()
    } catch (error) {
      message.error(error.message)
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
        <div className="company-history-controls">
          <Select value={historyStatus || undefined} placeholder="All statuses" allowClear onChange={(value) => { setHistoryStatus(value || ''); setHistoryPage(1) }} options={['CREATE', 'ACTIVE', 'EXPIRED', 'TERMINATED'].map((value) => ({ value, label: value }))} />
          <Select value={historyActive || undefined} placeholder="All activity" allowClear onChange={(value) => { setHistoryActive(value || ''); setHistoryPage(1) }} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
        </div>
        {!loading && !contracts.length && <Typography.Text tone="secondary">No contract history is available.</Typography.Text>}
        <div className="company-contract-list" aria-busy={loading}>
          {contracts.map((contract) => <div className="company-contract-card company-contract-history-card" key={contract.id}>
            <Tag color={contract.isActive ? 'success' : 'default'}>{contract.status}</Tag>
            <div><span>Contract number</span><strong>{contract.contractNumber || '-'}</strong></div>
            <div><span>Contract date</span><strong>{formatContractDate(contract.contractDate)}</strong></div>
            <div><span>Effective from</span><strong>{formatContractDate(contract.effectiveFrom)}</strong></div>
            <div><span>Effective until</span><strong>{formatContractDate(contract.effectiveUntil)}</strong></div>
          </div>)}
        </div>
        <div className="company-history-pagination">
          <Button disabled={loading || pagination.page <= 1} onClick={() => setHistoryPage((page) => page - 1)}>Previous</Button>
          <span>Page {pagination.page || historyPage} of {pagination.totalPages || 1} · {pagination.total || 0} contracts</span>
          <Select value={historyLimit} onChange={(value) => { setHistoryLimit(value); setHistoryPage(1) }} options={[10, 20, 50, 100].map((value) => ({ value, label: `${value} / page` }))} />
          <Button disabled={loading || (pagination.page || historyPage) >= (pagination.totalPages || 1)} onClick={() => setHistoryPage((page) => page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  </section>

  if (historyOnly) return historySection

  return <>
    <section className="company-view-section company-contract-section">
    {confirmation}
    <div className="company-view-section-heading">
      <div><h3>Active Contract</h3><Typography.Text tone="secondary">The current active contract returned by the company-detail endpoint.</Typography.Text></div>
      <div className="company-contract-actions">
        <Button variant="primary" onClick={openCreate}>Add Contract</Button>
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
          {activeContract.hasList && <Button variant="text" icon={<EyeOutlined />} title="View Price List" onClick={() => setPriceListContract(activeContract)} />}
          <Button variant="text" icon={<UploadOutlined />} title="Upload Price List" onClick={() => setUploadContract(activeContract)} />
          <Button variant="text" icon={<EditOutlined />} title="Update Contract" onClick={() => openUpdate(activeContract)} />
          <Popconfirm title="Terminate this contract?" description="This action cannot be undone." okText="Terminate" cancelText="Cancel" okButtonProps={{ danger: true }} onConfirm={() => terminateContract(activeContract)}>
            <Button variant="text" isDanger icon={<DeleteOutlined />} title="Terminate Contract" busy={terminating} />
          </Popconfirm>
        </div>
      </div>
    </div> : <Typography.Text tone="secondary">No contract is currently active for this company.</Typography.Text>}

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
    <Modal title={`Price List: ${priceListContract?.contractNumber || ''}`} visible={Boolean(priceListContract)} footer={null} width={1000} onCancel={() => setPriceListContract(null)} unmountOnClose>
      <Table rowKey="id" busy={priceListLoading} dataSource={priceList.prices || []} scroll={{ x: 850 }} pagination={{ total: priceList.pagination?.total || 0, pageSize: 100, hideOnSinglePage: true }}
        columns={[
          { title: 'Service', render: (_, row) => row.itemSize?.item?.service?.name || '-' },
          { title: 'Item', render: (_, row) => row.itemSize?.item?.name || '-' },
          { title: 'Size', render: (_, row) => row.itemSize?.size || '-' },
          { title: 'Service Price', dataIndex: 'priceService', render: (value) => value ?? '-' },
          { title: 'Maintenance Price', dataIndex: 'priceMaintenance', render: (value) => value ?? '-' },
          { title: 'Status', dataIndex: 'isActive', render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag> },
        ]} />
    </Modal>
    {uploadContract && <CompanyContractUpload company={company} contract={uploadContract} onClose={() => setUploadContract(null)} onChanged={refreshCompanyDetail} />}
    </section>
  </>
}
