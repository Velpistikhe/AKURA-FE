import { useCallback, useEffect, useRef, useState } from 'react'
import { App, Button, Modal, Typography, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import { loadAll } from '../quotation/quotationModel'
import { selectImportContract } from './contractPriceModel'

export function validateWorkbook(file) {
  if (!file) return 'Select an Excel file.'
  if (!/\.xlsx$/i.test(file.name)) return 'Only .xlsx files are accepted.'
  if (!file.size || file.size > 5 * 1024 * 1024) return 'Choose a nonempty file up to 5 MB.'
  return ''
}

export default function CompanyContractUpload({ company, onClose, onChanged }) {
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
    const requestId = ++requestRef.current
    setLoading(true)
    setContractId(undefined)
    try {
      const rows = await loadAll(contractService.list, 'contracts', { companyId: company.id, status: 'ACTIVE', isActive: 'true' })
      if (requestId !== requestRef.current) return
      const target = selectImportContract(rows)
      setContracts(target ? [target] : [])
      setContractId(target?.id)
    } catch (err) {
      if (requestId === requestRef.current) { setError(err.message); setContracts([]) }
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [company.id])
  useEffect(() => {
    loadContracts()
    return () => { requestRef.current++ }
  }, [loadContracts])

  const upload = async () => {
    if (busyRef.current || loading) return
    const selected = contracts.find((row) => row.id === contractId)
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
      onChanged?.()
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
    onOk={upload} okText="Upload" busy={saving} okButtonProps={{ disabled: loading || !contracts.some((row) => row.id === contractId) || !file }}
    cancelButtonProps={{ disabled: saving }} closable={!saving} mask={{ closable: !saving }} keyboard={!saving}>
    {confirmation}
    <div className="contract-upload-fields">
      <p>Download the Excel template from the Item menu, edit Service Price and Maintenance Price. Every item row in the file will be imported, including unchanged rows. Keep the hidden columns unchanged. Upload creates new contract prices; existing prices cannot be replaced.</p>
      <Typography.Text>The upload uses the currently valid ACTIVE contract, or the earliest future ACTIVE contract when none is currently valid.</Typography.Text>
      {loading ? <p>Loading target contract...</p> : contracts.length > 0 ? <p>Target contract: <strong>{contracts[0].contractNumber}</strong> ? {contracts[0].effectiveFrom.slice(0, 10)} ? {contracts[0].effectiveUntil.slice(0, 10)}</p>
        : <p>No eligible contract found. Approve a contract that has not ended before uploading prices.</p>}
      <Button disabled={saving || loading} onClick={() => { setError(''); loadContracts() }}>Reload contract</Button>
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
