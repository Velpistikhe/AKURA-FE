import { useCallback, useEffect, useRef, useState } from 'react'
import { App, Button, Modal, Select, Typography, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import { loadAll } from '../quotation/quotationModel'

export function validateWorkbook(file) {
  if (!file) return 'Select an Excel file.'
  if (!/\.xlsx$/i.test(file.name)) return 'Only .xlsx files are accepted.'
  if (!file.size || file.size > 5 * 1024 * 1024) return 'Choose a nonempty file up to 5 MB.'
  return ''
}

export default function CompanyContractUpload({ company, contract = null, onClose, onChanged }) {
  const [closing, setClosing] = useState(false)
  const { message } = App.useApp()
  const [confirmSave, confirmation] = useSaveConfirmation()
  const [contracts, setContracts] = useState([])
  const [contractId, setContractId] = useState()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [details, setDetails] = useState([])
  const busyRef = useRef(false)
  const requestRef = useRef(0)
  const loadContracts = useCallback(async () => {
    if (contract) {
      setContracts([contract])
      setContractId(contract.id)
      setLoading(false)
      return
    }
    const requestId = ++requestRef.current
    setLoading(true)
    setContractId(undefined)
    try {
      const rows = await loadAll(contractService.list, 'contracts', { companyId: company.id })
      if (requestId !== requestRef.current) return
      setContracts(rows.filter((row) => row.isActive && ['CREATE', 'ACTIVE'].includes(row.status)
        && (!row.effectiveUntil || new Date(row.effectiveUntil).getTime() > Date.now())))
    } catch (err) {
      if (requestId === requestRef.current) { setError(err.message); setContracts([]) }
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [company.id, contract])
  useEffect(() => {
    loadContracts()
    return () => { requestRef.current++ }
  }, [loadContracts])

  const upload = async () => {
    if (busyRef.current || loading) return
    const selected = contract || contracts.find((row) => row.id === contractId)
    const validation = validateWorkbook(file)
    if (!selected || validation) { setError(!selected ? 'Select a contract.' : validation); return }
    busyRef.current = true
    setSaving(true)
    try {
      if (!await confirmSave('contract item prices')) return
      setError('')
      setDetails([])
      const response = await contractService.importPrices(selected.id, { companyId: company.id, version: selected.version, file })
      message.success(`${response.data?.imported ?? 0} contract item prices imported successfully.`)
      setClosing(true)
      onChanged()
    } catch (err) {
      setError(err.message)
      setDetails(Array.isArray(err.details) ? err.details : [])
      if (err.status === 409) await loadContracts()
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  return <Modal title={`Upload Contract Items — ${company.name}`} visible={!closing}
    onCancel={() => { if (!busyRef.current) setClosing(true) }} afterClose={onClose}
    onOk={upload} okText="Upload" busy={saving} okButtonProps={{ disabled: loading || !(contract || contractId) || !file }}
    cancelButtonProps={{ disabled: saving }} closable={!saving} mask={{ closable: !saving }} keyboard={!saving}>
    {confirmation}
    <div className="contract-upload-fields">
      <p>Download the Excel template from the Item menu, edit the prices, and choose YA for the rows to import. Keep the hidden columns unchanged. Upload creates new contract prices; existing prices cannot be replaced.</p>
      {!contract && <>
      <label htmlFor="contract-upload-contract">Company contract</label>
      <Select id="contract-upload-contract" placeholder="Select a contract" value={contractId} onChange={setContractId}
        loading={loading} disabled={loading || saving} options={contracts.map((row) => ({ value: row.id,
          label: `${row.status} · ${new Date(row.effectiveFrom).toLocaleDateString()} – ${row.effectiveUntil ? new Date(row.effectiveUntil).toLocaleDateString() : 'No end date'} · ${row.id.slice(0, 8)}` }))} />
      {!loading && !contracts.length && <Typography.Text>No eligible contract found. A CREATE or ACTIVE contract that has not ended is required.</Typography.Text>}
      <Button disabled={saving || loading} onClick={() => { setError(''); loadContracts() }}>Reload contracts</Button>
      </>}
      <label htmlFor="contract-upload-file">Excel file (.xlsx, up to 5 MB)</label>
      <input id="contract-upload-file" type="file" accept=".xlsx" disabled={saving} onChange={(event) => {
        const selected = event.target.files?.[0]
        const validation = validateWorkbook(selected)
        setError(validation)
        setDetails([])
        setFile(validation ? null : selected)
      }} />
      {error && <div role="alert"><Typography.Text tone="danger">{error}</Typography.Text>
        {details.length > 0 && <ul className="contract-upload-errors">{details.map((detail, index) => <li key={index}>
          {detail.row ? `Row ${detail.row}: ` : ''}{detail.field ? `${detail.field}: ` : ''}{detail.message}
        </li>)}</ul>}
      </div>}
    </div>
  </Modal>
}
