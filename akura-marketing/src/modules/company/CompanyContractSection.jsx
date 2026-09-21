import { useState } from 'react'
import { App, Button, Form, Input, Modal, Typography, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import PendingContracts from './PendingContracts'
import CompanyContractPrices from './CompanyContractPrices'
import { canManageCompanyContracts, canUpdateContract, canReviseContract, canTerminateContract } from './contractAccess'

function formatContractDate(value) {
  return value ? String(value).slice(0, 10) : '-'
}

export default function CompanyContractSection({ company, currentUser, onChanged }) {
  const readOnly = company.revoked === true
  const [pendingRevision, setPendingRevision] = useState(0)
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [terminationForm] = Form.useForm()
  const [confirmSave, confirmation] = useSaveConfirmation()
  const [creationBlocked, setCreationBlocked] = useState(true)
  const [saving, setSaving] = useState(false)
  const [terminating, setTerminating] = useState(false)
  const [terminationContract, setTerminationContract] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editMode, setEditMode] = useState('update')
  const [editingContract, setEditingContract] = useState(null)
  const [priceListContract, setPriceListContract] = useState(null)
  const [priceListOpen, setPriceListOpen] = useState(false)
  const [contractsVisible, setContractsVisible] = useState(false)

  const refreshCompanyDetail = async () => {
    setPendingRevision((value) => value + 1)
    await onChanged?.()
  }

  const openCreate = () => {
    if (readOnly || creationBlocked || !canManageCompanyContracts(currentUser)) return
    form.resetFields()
    form.setFieldsValue({ contractNumber: '', contractDate: '', effectiveFrom: '', effectiveUntil: '' })
    setCreateOpen(true)
  }

  const openUpdate = (contract, mode = 'update') => {
    if (readOnly || !(mode === 'revise' ? canReviseContract(currentUser, contract) : canUpdateContract(currentUser, contract))) return
    form.resetFields()
    form.setFieldsValue({
      contractNumber: contract.contractNumber,
      contractDate: formatContractDate(contract.contractDate),
      effectiveFrom: formatContractDate(contract.effectiveFrom),
      effectiveUntil: formatContractDate(contract.effectiveUntil),
    })
    setEditMode(mode)
    setEditingContract(contract)
  }

  const createContract = async () => {
    if (readOnly || creationBlocked || !canManageCompanyContracts(currentUser)) return
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
      if (error.status === 409) {
        setCreateOpen(false)
        setEditingContract(null)
        await refreshCompanyDetail()
      }
    } finally {
      setSaving(false)
    }
  }

  const updateContract = async () => {
    if (readOnly || !(editMode === 'revise' ? canReviseContract(currentUser, editingContract) : canUpdateContract(currentUser, editingContract))) return
    const values = await form.validateFields()
    if (new Date(values.effectiveUntil) <= new Date(values.effectiveFrom)) {
      form.setFields([{ name: 'effectiveUntil', errors: ['End date must be after the start date.'] }])
      return
    }
    if (values.contractDate > values.effectiveFrom) {
      form.setFields([{ name: 'contractDate', errors: ['Contract date must be on or before the start date.'] }])
      return
    }
    if (!await confirmSave(editMode === 'revise' ? 'company contract revision' : 'company contract changes')) return
    setSaving(true)
    try {
      const save = editMode === 'revise' ? contractService.revise : contractService.update
      await save(editingContract.id, {
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
      if (error.status === 409) {
        setCreateOpen(false)
        setEditingContract(null)
        await refreshCompanyDetail()
      }
    } finally {
      setSaving(false)
    }
  }

  const terminateContract = async () => {
    if (readOnly || !canTerminateContract(currentUser, terminationContract)) return
    const { terminatedAt } = await terminationForm.validateFields()
    const contract = terminationContract
    if (terminatedAt < formatContractDate(contract.effectiveFrom) || terminatedAt > formatContractDate(contract.effectiveUntil)) {
      terminationForm.setFields([{ name: 'terminatedAt', errors: ['Termination date must be within the contract period.'] }])
      return
    }
    if (!await confirmSave('contract termination')) return
    setTerminating(true)
    try {
      await contractService.terminate(contract.id, contract.version, terminatedAt)
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

  const pricesModal = priceListOpen && <CompanyContractPrices company={company} currentUser={currentUser} initialContract={priceListContract}
    onClose={() => setPriceListOpen(false)} onChanged={refreshCompanyDetail} />

  return <>
    <section className="company-view-section company-contract-section">
    {confirmation}
    <div className="company-view-section-heading">
      <div><h3>Contracts</h3><Typography.Text tone="secondary">All contracts for this company.</Typography.Text></div>
      <div className="company-contract-actions">
        {contractsVisible && !readOnly && canManageCompanyContracts(currentUser) && <Button variant="primary" disabled={creationBlocked} onClick={openCreate}>Add Contract</Button>}
        <Button variant="link" aria-expanded={contractsVisible} aria-controls="company-contract-cards" onClick={() => setContractsVisible((visible) => !visible)}>{contractsVisible ? 'Hide Contracts' : 'Show Contracts'}</Button>
      </div>
    </div>
    <div id="company-contract-cards" hidden={!contractsVisible}>
    <PendingContracts visible={contractsVisible} onCreationBlocked={setCreationBlocked} onEdit={openUpdate} onRevise={(contract) => openUpdate(contract, 'revise')} onTerminate={(contract) => { terminationForm.resetFields(); setTerminationContract(contract) }} readOnly={readOnly} companyId={company.id} currentUser={currentUser} revision={pendingRevision} onChanged={refreshCompanyDetail} onView={(row) => { setPriceListContract(row); setPriceListOpen(true) }} />

    </div>

    <Modal title={`Add Contract: ${company.name}`} visible={createOpen} busy={saving} okText="Create" onOk={createContract}
      onCancel={() => { if (!saving) setCreateOpen(false) }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }} cancelButtonProps={{ disabled: saving }} unmountOnClose>
      <Form form={form} layout="vertical" preserve={false}>
        <Typography.Text tone="secondary">This contract will be created for {company.name}. It will be created as DRAFT. Submit it for approval by an ADMIN in Marketing. Contract date must be on or before the start date.</Typography.Text>
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
    <Modal title={`${editMode === 'revise' ? 'Revise Contract' : 'Edit Contract'}: ${company.name}`} visible={Boolean(editingContract)} busy={saving} okText={editMode === 'revise' ? 'Revise' : 'Update'} onOk={updateContract}
      onCancel={() => { if (!saving) setEditingContract(null) }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }} cancelButtonProps={{ disabled: saving }} unmountOnClose>
      <Form form={form} layout="vertical" preserve={false}>
        <Typography.Text tone="secondary">{editMode === 'revise' ? 'Create a draft revision and submit it for approval. The original contract changes only after approval, when it is marked REVISED.' : 'Update contract details. A rejected contract returns to DRAFT and must be submitted again.'}</Typography.Text>
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
    </section>
  </>
}
