import { useCallback, useEffect, useRef, useState } from 'react'
import { App, Button, Modal, Typography, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import { contractUploadTargets } from './contractPriceModel'

export function validateWorkbook(file) {
  if (!file) return 'Select an Excel file.'
  if (!/\.xlsx$/i.test(file.name)) return 'Only .xlsx files are accepted.'
  if (!file.size || file.size > 5 * 1024 * 1024) return 'Choose a nonempty file up to 5 MB.'
  return ''
}

export default function CompanyContractUpload({ company, contractId, onClose, onChanged }) {
  const [closing, setClosing] = useState(false)
  const { message } = App.useApp()
  const [confirmSave, confirmation] = useSaveConfirmation()
  const [contracts, setContracts] = useState([])
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
    setContracts([])
    try {
      if (!contractId) return
      const { data: contract } = await contractService.get(contractId)
      if (requestId !== requestRef.current) return
      const targets = contract.companyId === company.id ? contractUploadTargets([contract]) : []
      setContracts(targets)
    } catch (err) {
      if (requestId === requestRef.current) { setError(err.message); setContracts([]) }
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [company.id, contractId])
  useEffect(() => {
    loadContracts()
    return () => { requestRef.current++ }
  }, [loadContracts])

  const upload = async () => {
    if (busyRef.current || loading) return
    const selected = contracts.find((row) => row.id === contractId)
    const validation = validateWorkbook(file)
    if (!selected || validation) { setError(!selected ? 'This contract is not available for upload.' : validation); return }
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

  const targetContract = contracts.find((row) => row.id === contractId)

  return <Modal title={`Upload Contract Items — ${company.name}`} visible={!closing}
    onCancel={() => { if (!busyRef.current) setClosing(true) }} afterClose={onClose}
    onOk={upload} okText="Upload" busy={saving} okButtonProps={{ disabled: loading || !contracts.some((row) => row.id === contractId) || !file }}
    cancelButtonProps={{ disabled: saving }} closable={!saving} mask={{ closable: !saving }} keyboard={!saving}>
    {confirmation}
    <div className="contract-upload-fields">
      <p>Download the Excel template from the Item menu, edit Service Price and Maintenance Price. Every item row in the file will be imported, including unchanged rows. Keep the hidden columns unchanged. Upload creates new contract prices; existing prices cannot be replaced.</p>
      <Typography.Text>The price list will be uploaded to the contract shown in View Contract. Uploading does not change its status.</Typography.Text>
      {loading ? <p>Loading contract...</p> : targetContract
        ? <p>Contract: <strong>{targetContract.contractNumber}</strong> · {targetContract.status}</p>
        : <p>This contract is not available for upload.</p>}
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
