import { useEffect, useRef, useState } from 'react'
import { CheckOutlined } from '@ant-design/icons'
import { App, Button, Popconfirm, Table, Typography, UploadOutlined } from '../../components/global'
import { contractService } from '../../services/contractService'
import { canApproveContract } from './contractAccess'

export default function PendingContracts({ companyId, currentUser, revision, onChanged, onUpload, readOnly = false }) {
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [data, setData] = useState({ contracts: [], pagination: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const lock = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    contractService.list({ companyId, status: 'CREATE', isActive: 'true', page, limit: 20 })
      .then((response) => { if (active) { setData(response.data); if (!response.data.contracts.length && page > 1) setPage(Math.max(1, response.data.pagination.totalPages)) } })
      .catch((err) => { if (active) { setError(err.message); setData({ contracts: [], pagination: {} }) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [companyId, page, retry, revision])
  const approve = async (record) => {
    if (readOnly || lock.current || !canApproveContract(currentUser, record)) return
    lock.current = true; setBusy(record.id)
    try {
      const { data: latest } = await contractService.get(record.id)
      if (!canApproveContract(currentUser, latest)) throw new Error('This contract is no longer awaiting approval.')
      await contractService.approve(latest.id, latest.version)
      message.success('Contract approved.')
      await onChanged?.()
    } catch (err) { message.error(err.message) }
    finally { lock.current = false; setBusy(null); setRetry((value) => value + 1) }
  }
  if (!loading && !error && !data.contracts.length) return null
  return <div style={{ marginTop: 20 }}>
    <div className="company-view-section-heading"><div><h3>Pending Contracts</h3><Typography.Text tone="secondary">Contracts awaiting administrator approval.</Typography.Text></div></div>
    {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
    <Table rowKey="id" loading={loading} dataSource={data.contracts} scroll={{ x: 700 }} columns={[
      { title: 'Contract Number', dataIndex: 'contractNumber' },
      { title: 'Effective From', dataIndex: 'effectiveFrom' }, { title: 'Effective Until', dataIndex: 'effectiveUntil' },
      { title: 'Actions', render: (_, record) => <>
        {!readOnly && record.isActive !== false && <Button variant="text" icon={<UploadOutlined />} title="Upload Price List" disabled={Boolean(busy)} onClick={() => onUpload(record)} />}
        {!readOnly && canApproveContract(currentUser, record) && <Popconfirm title="Approve contract?" description="The contract will become ACTIVE." onConfirm={() => approve(record)}>
          <Button variant="text" icon={<CheckOutlined />} title="Approve Contract" busy={busy === record.id} disabled={Boolean(busy)} />
        </Popconfirm>}
      </> },
    ]} pagination={{ current: page, pageSize: 20, total: data.pagination?.total || 0, onChange: setPage, showSizeChanger: false }} />
  </div>
}
