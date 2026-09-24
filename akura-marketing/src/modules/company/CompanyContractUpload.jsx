import { useEffect, useRef, useState } from 'react'
import { App, Modal, Tag, Typography, UploadOutlined, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import { contractUploadTargets } from './contractPriceModel'

export function validateWorkbook(file) {
  if (!file) return 'Select an Excel file.'
  if (!/\.xlsx$/i.test(file.name)) return 'Only .xlsx files are accepted.'
  if (!file.size || file.size > 5 * 1024 * 1024) return 'Choose a nonempty file up to 5 MB.'
  return ''
}

export default function CompanyContractUpload({ company, contractId, onClose, onChanged }) {
  const { message } = App.useApp()
  const [contract, setContract] = useState(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    let active = true
    contractService.get(contractId).then(({ data }) => {
      if (!active) return
      if (!data || data.id !== contractId || data.companyId !== company.id || !contractUploadTargets([data]).length) {
        throw new Error('This contract is not available for upload.')
      }
      setContract(data)
    }).catch((error) => {
      if (active) { message.error(error.message); closeRef.current() }
    })
    return () => { active = false }
  }, [company.id, contractId, message])
  return contract ? <ContractUploadDialog company={company} contract={contract} onClose={onClose} onChanged={onChanged} /> : null
}

function ContractUploadDialog({ company, contract, onClose, onChanged }) {
  const [closing, setClosing] = useState(false)
  const { message } = App.useApp()
  const [confirmSave, confirmation] = useSaveConfirmation()
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [details, setDetails] = useState([])
  const busyRef = useRef(false)
  const upload = async () => {
    if (busyRef.current) return
    const validation = validateWorkbook(file)
    if (validation) { setError(validation); return }
    busyRef.current = true
    setSaving(true)
    try {
      if (!await confirmSave('contract item prices')) return
      setError('')
      setDetails([])
      const response = await contractService.importPrices(contract.id, { companyId: company.id, version: contract.version, file })
      message.success(`${response.data?.imported ?? 0} contract item prices imported successfully.`)
      setClosing(true)
      onChanged?.()
    } catch (err) {
      setError(err.message)
      setDetails(Array.isArray(err.details) ? err.details : [])
      if ([404, 409].includes(err.status)) {
        message.error(err.message)
        setClosing(true)
        onChanged?.()
      }
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  return <Modal title="Upload Contract Items" className="contract-upload-modal" width={640} visible={!closing}
    onCancel={() => { if (!busyRef.current) setClosing(true) }} afterClose={onClose}
    onOk={upload} okText="Upload Price List" busy={saving} okButtonProps={{ disabled: !file }}
    cancelButtonProps={{ disabled: saving }} closable={!saving} mask={{ closable: !saving }} keyboard={!saving}>
    {confirmation}
    <div className="contract-upload-fields">
      <section className="contract-upload-summary" aria-label="Selected contract">
        <span className="contract-upload-eyebrow">SELECTED CONTRACT</span>
        <div className="contract-upload-title"><strong>{contract.contractNumber}</strong><Tag>{contract.status}</Tag></div>
        <p>{contract.companySnapshot?.name || company.name}</p>
        <dl><div><dt>Contract date</dt><dd>{contract.contractDate?.slice(0, 10) || '-'}</dd></div>
          <div><dt>Effective period</dt><dd>{contract.effectiveFrom?.slice(0, 10) || '-'} to {contract.effectiveUntil?.slice(0, 10) || '-'}</dd></div></dl>
      </section>
      <div className="contract-upload-guide">
        <Typography.Text strong>Prepare your price list</Typography.Text>
        <ol><li>Download the Excel template from the Item menu.</li>
          <li>Fill in Service Price and Maintenance Price. Keep hidden columns unchanged.</li></ol>
        <p>Every item row will be imported, including unchanged rows. Existing contract prices cannot be replaced. The contract status stays the same.</p>
      </div>
      <label className={`contract-upload-dropzone${saving ? ' is-disabled' : ''}`} htmlFor="contract-upload-file">
        <UploadOutlined aria-hidden="true" />
        <strong>{file ? file.name : 'Choose or drop an Excel file'}</strong>
        <span>{file ? `${(file.size / 1024).toFixed(1)} KB - Click to replace` : '.xlsx only - Maximum 5 MB'}</span>
        <input id="contract-upload-file" type="file" accept=".xlsx" disabled={saving} aria-label="Excel price list" onChange={(event) => {
          const selected = event.target.files?.[0]
          const validation = validateWorkbook(selected)
          setError(validation)
          setDetails([])
          setFile(validation ? null : selected)
          if (validation) event.target.value = ''
        }} />
      </label>
      {error && <div className="contract-upload-error" role="alert"><Typography.Text tone="danger">{error}</Typography.Text>
        {details.length > 0 && <ul className="contract-upload-errors">{details.map((detail, index) => <li key={index}>
          {detail.row ? `Row ${detail.row}: ` : ''}{detail.field ? `${detail.field}: ` : ''}{detail.message}
        </li>)}</ul>}
      </div>}
    </div>
  </Modal>
}
