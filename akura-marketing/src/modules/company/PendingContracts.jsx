import { useEffect, useRef, useState } from 'react'
import { App, Button, Pagination, Popconfirm, Space, Tag, Typography, EyeOutlined, EditOutlined, DeleteOutlined, SendOutlined, CloseOutlined } from '../../components/global'
import { contractService } from '../../services/contractService'
import { blocksContractCreation, canApproveContract, canUpdateContract, canReviseContract, canTerminateContract, canSubmitContract, canRejectContract, canCancelContract } from './contractAccess'

export default function PendingContracts({ visible, onCreationBlocked, onEdit, onRevise, onTerminate, companyId, currentUser, revision, onChanged, onView, readOnly = false }) {
  const { message } = App.useApp()
  const [retry, setRetry] = useState(0)
  const [data, setData] = useState({ contracts: [], pagination: {} })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const lock = useRef(false)
  useEffect(() => {
    if (!visible) return
    let active = true
    setLoading(true); setError('')
    onCreationBlocked(true)
    contractService.list({ companyId, page, limit })
      .then(({ data: result }) => {
        if (!active) return
        const lastPage = Math.max(1, result.pagination?.totalPages || 1)
        if (page > lastPage) { setPage(lastPage); return }
        setData(result)
        onCreationBlocked(result.contracts.some(blocksContractCreation))
      })
      .catch((err) => { if (active) { setError(err.message); setData({ contracts: [], pagination: {} }) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [companyId, visible, page, limit, retry, revision, onCreationBlocked])
  const actions = [
    { key: 'submit', label: 'Submit', icon: <SendOutlined />, allowed: canSubmitContract, description: 'Send this draft for administrator review.' },
    { key: 'approve', label: 'Approve', allowed: canApproveContract, description: 'Approve this contract. A revision will replace its original contract.' },
    { key: 'reject', label: 'Reject', allowed: canRejectContract, description: 'Return this contract for correction.' },
    { key: 'cancel', label: 'Cancel', icon: <CloseOutlined />, allowed: canCancelContract, description: 'Remove this draft from the active list. Its audit history is retained.' },
  ]
  const transition = async (record, action) => {
    if (readOnly || lock.current || !action.allowed(currentUser, record)) return
    lock.current = true; setBusy(record.id)
    try {
      const { data: latest } = await contractService.get(record.id)
      if (!action.allowed(currentUser, latest)) throw new Error('Contract status has changed. Reload and try again.')
      await contractService[action.key](latest.id, latest.version)
      message.success('Contract updated successfully.')
      await onChanged?.()
    } catch (err) { message.error(err.message) }
    finally { lock.current = false; setBusy(null); setRetry((value) => value + 1) }
  }
  return <div>
    {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
    {loading ? <Typography.Text>Loading contracts...</Typography.Text> : <div className="company-contract-list">
    {data.contracts.map((record) => <article className="company-contract-card" key={record.id} aria-label={`Contract ${record.contractNumber}`}>
      <header className="company-contract-card-header">
        <div className="company-contract-identity">
          <div className="company-contract-title"><h4>{record.contractNumber}</h4><Tag data-status={record.status}>{record.status}</Tag></div>
          <p>{record.companySnapshot?.name || '-'}</p>
        </div>
      <div className="company-contract-row-actions">
        <Space size={4} wrap>
        <Button size="small" variant="text" icon={<EyeOutlined />} title="View Contract Prices" disabled={Boolean(busy)} onClick={() => onView(record)}>Prices</Button>
        {!readOnly && canUpdateContract(currentUser, record) && <Button size="small" variant="text" icon={<EditOutlined />} title="Edit Contract" disabled={Boolean(busy)} onClick={() => onEdit(record)} />}
        {!readOnly && canReviseContract(currentUser, record) && <Button size="small" variant="text" disabled={Boolean(busy)} onClick={() => onRevise(record)}>Revise</Button>}
        {!readOnly && canTerminateContract(currentUser, record) && <Button size="small" variant="text" isDanger icon={<DeleteOutlined />} title="Terminate Contract" disabled={Boolean(busy)} onClick={() => onTerminate(record)} />}
        {!readOnly && actions.filter((action) => action.allowed(currentUser, record)).map((action) => <Popconfirm key={action.key} title={`${action.label} contract?`} description={action.description} onConfirm={() => transition(record, action)}>
          <Button size="small" variant="text" icon={action.icon} title={`${action.label} Contract`} isDanger={['reject', 'cancel'].includes(action.key)} busy={busy === record.id} disabled={Boolean(busy)}>{action.icon ? null : action.label}</Button>
        </Popconfirm>)}
      </Space>
      </div>
      </header>
      <dl className="company-contract-metadata">
        <div><dt>Contract date</dt><dd>{record.contractDate?.slice(0, 10) || '-'}</dd></div>
        <div><dt>Effective period</dt><dd>{record.effectiveFrom?.slice(0, 10) || '-'} <span className="company-contract-date-divider">–</span> {record.effectiveUntil?.slice(0, 10) || '-'}</dd></div>
        <div><dt>Price list</dt><dd className={record.hasList ? 'company-contract-price-ready' : ''}>{record.hasList ? 'Available' : 'Not added'}</dd></div>
      </dl>
      {record.revisionOfId && <p className="company-contract-revision">Revision of <span>{record.revisionOfId}</span></p>}
    </article>)}
    {!data.contracts.length && !error && <Typography.Text tone="secondary">No contracts found.</Typography.Text>}
    </div>}
    <Pagination className="company-contract-pagination" current={page} pageSize={limit} total={data.pagination?.total || 0}
      disabled={loading || Boolean(busy)} showSizeChanger pageSizeOptions={[5, 10, 20, 50]} showTotal={(total) => `${total} contracts`}
      onChange={(nextPage, nextLimit) => { setPage(nextLimit !== limit ? 1 : nextPage); setLimit(nextLimit) }} />
  </div>
}
