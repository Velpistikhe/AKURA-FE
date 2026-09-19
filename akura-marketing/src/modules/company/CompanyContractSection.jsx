import { useCallback, useEffect, useState } from 'react'
import { App, Button, DeleteOutlined, EditOutlined, EyeOutlined, Form, Input, Modal, Table, Tag, Typography, UploadOutlined, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import CompanyContractUpload from './CompanyContractUpload'
import PendingContracts from './PendingContracts'
import CompanyContractPrices from './CompanyContractPrices'
import { canAdministerContracts, canManageCompanyContracts } from './contractAccess'
import { canReceiveContractPrices } from './contractPriceModel'
import { canViewInactiveCatalog } from '../catalogAccess'

function formatContractDate(value) {
  return value ? String(value).slice(0, 10) : '-'
}

export default function CompanyContractSection({ company, currentUser, onChanged, historyOnly = false }) {
  const readOnly = company.revoked === true
  const canViewInactive = canViewInactiveCatalog(currentUser)
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
  const [uploadOpen, setUploadOpen] = useState(false)
  const [priceListContract, setPriceListContract] = useState(null)
  const [priceListOpen, setPriceListOpen] = useState(false)
  const [contractHistoryVisible, setContractHistoryVisible] = useState(false)

  const loadContracts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await contractService.list({ companyId: company.id, page: historyPage, limit: historyLimit, status: historyStatus, isActive: canViewInactive ? historyActive : 'true' })
      setContracts(response.data?.contracts || [])
      setPagination(response.data?.pagination || { page: historyPage, total: 0, totalPages: 1 })
    } catch (error) {
      setContracts([])
      message.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [company.id, historyActive, historyLimit, historyPage, historyStatus, message, canViewInactive])

  useEffect(() => {
    if (contractHistoryVisible) loadContracts()
  }, [contractHistoryVisible, loadContracts])

  const refreshCompanyDetail = async () => {
    setPendingRevision((value) => value + 1)
    if (contractHistoryVisible) await loadContracts()
    await onChanged?.()
  }

  const openCreate = () => {
    if (readOnly || !canManageCompanyContracts(currentUser)) return
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
    if (readOnly || !canManageCompanyContracts(currentUser)) return
    const values = await form.validateFields()
    const effectiveFrom = new Date(values.effectiveFrom)
    const effectiveUntil = new Date(values.effectiveUntil)
    if (effectiveUntil <= effectiveFrom) {
      form.setFields([{ name: 'effectiveUntil', errors: ['End date must be after the start date.'] }])
      return
    }
    if (values.contractDate > values.effectiveFrom) {
      form.setFields([{ name: 'contractDate', errors: ['Contract date must be on or before the start date.'] }])
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
    if (values.contractDate > values.effectiveFrom) {
      form.setFields([{ name: 'contractDate', errors: ['Contract date must be on or before the start date.'] }])
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
            { title: 'Prices', render: (_, row) => <Button variant="text" icon={<EyeOutlined />} title="View Contract Prices" onClick={() => { setPriceListContract(row); setPriceListOpen(true) }} /> },
            { title: 'Contract Date', dataIndex: 'contractDate', render: formatContractDate },
            { title: 'Effective From', dataIndex: 'effectiveFrom', render: formatContractDate },
            { title: 'Effective Until', dataIndex: 'effectiveUntil', render: formatContractDate },
            { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag>,
              filters: ['CREATE', 'ACTIVE', 'EXPIRED', 'TERMINATED'].map((value) => ({ text: value, value })),
              filterMultiple: false, filteredValue: historyStatus ? [historyStatus] : null },
            { title: 'Activity', dataIndex: 'isActive', render: (value) => <Tag>{value ? 'Active' : 'Inactive'}</Tag>,
              filters: canViewInactive ? [{ text: 'Active', value: 'true' }, { text: 'Inactive', value: 'false' }] : undefined,
              filterMultiple: false, filteredValue: canViewInactive && historyActive ? [historyActive] : null },
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

  const pricesModal = priceListOpen && <CompanyContractPrices company={company} currentUser={currentUser} initialContract={priceListContract}
    onClose={() => setPriceListOpen(false)} onChanged={refreshCompanyDetail} />

  if (historyOnly) return <>{historySection}{pricesModal}</>

  return <>
    <section className="company-view-section company-contract-section">
    {confirmation}
    <div className="company-view-section-heading">
      <div><h3>{activeContract ? 'Active Contract' : 'Contracts'}</h3>{activeContract && <Typography.Text tone="secondary">The company's currently effective contract.</Typography.Text>}</div>
      <div className="company-contract-actions">
        <Button onClick={() => { setPriceListContract(null); setPriceListOpen(true) }}>View Contract Prices</Button>
        {!readOnly && canManageCompanyContracts(currentUser) && <Button icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>Upload Price List</Button>}
        {!readOnly && canManageCompanyContracts(currentUser) && <Button variant="primary" disabled={Boolean(activeContract)} onClick={openCreate}>Add Contract</Button>}
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
          <Button variant="text" icon={<EyeOutlined />} title="View Price List" onClick={() => { setPriceListContract(activeContract); setPriceListOpen(true) }} />
          {!readOnly && canManageCompanyContracts(currentUser) && canReceiveContractPrices(activeContract) && <Button variant="text" icon={<UploadOutlined />} title="Upload Price List" onClick={() => setUploadOpen(true)} />}
          {canAdminister && activeContract.isActive !== false && <Button variant="text" icon={<EditOutlined />} title="Update Contract" onClick={() => openUpdate(activeContract)} />}
          {canAdminister && activeContract.isActive !== false && <Button variant="text" isDanger icon={<DeleteOutlined />} title="Terminate Contract" onClick={() => { terminationForm.resetFields(); setTerminationContract(activeContract) }} />}
        </div>
      </div>
    </div> : null}

    <Modal title={`Add Contract: ${company.name}`} visible={createOpen} busy={saving} okText="Create" onOk={createContract}
      onCancel={() => { if (!saving) setCreateOpen(false) }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }} cancelButtonProps={{ disabled: saving }} unmountOnClose>
      <Form form={form} layout="vertical" preserve={false}>
        <Typography.Text tone="secondary">This contract will be created for {company.name}. {canAdministerContracts(currentUser) ? 'It will be ACTIVE immediately.' : 'It will await administrator approval.'} Contract date must be on or before the start date.</Typography.Text>
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
    {pricesModal}
    <PendingContracts readOnly={readOnly} companyId={company.id} currentUser={currentUser} revision={pendingRevision} onChanged={refreshCompanyDetail} onView={(row) => { setPriceListContract(row); setPriceListOpen(true) }} />
    {!readOnly && canManageCompanyContracts(currentUser) && uploadOpen && <CompanyContractUpload company={company} onClose={() => setUploadOpen(false)} onChanged={refreshCompanyDetail} />}
    </section>
  </>
}
