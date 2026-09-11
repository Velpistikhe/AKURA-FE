import { useEffect, useState } from 'react'
import { Button, EyeOutlined, Modal, Tag, Typography } from '../../components/global'
import { companyService } from '../../services/companyService'

const labels = { name: 'Name', title: 'Title', telp: 'Phone', email: 'Email', company: 'Company', revoked: 'Deactivated' }

function valueFor(key, value) {
  if (key === 'company') return value?.name || '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value ?? '-'
}

export default function CompanyStaffHistorySection({ company, visible, revision = 0 }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ history: [], pagination: { totalPages: 1, total: 0 } })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!visible) return
    let active = true
    setLoading(true)
    companyService.staffHistory(company.id, { page, limit: 20 }).then((response) => {
      if (active) setData(response.data || { history: [], pagination: {} })
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [company.id, page, visible, revision])

  const pagination = data.pagination || {}
  return <div className="company-staff-history-list" aria-busy={loading}>
    {!loading && !data.history?.length && <Typography.Text tone="secondary">No staff history is available.</Typography.Text>}
    {data.history?.map((row) => <div className="company-contract-card company-staff-history-card" key={row.id}>
      <Tag>{row.action}</Tag>
      <div><span>Staff</span><strong>{row.snapshot?.name || '-'}</strong></div>
      <div><span>Version</span><strong>{row.version}</strong></div>
      <div><span>Changed by</span><strong>{row.createdByName || '-'}</strong></div>
      <div><span>Changed at</span><strong>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</strong></div>
      <Button
        variant="text"
        icon={<EyeOutlined />}
        title="View Staff History"
        aria-label={`View staff history ${row.snapshot?.name || ''} version ${row.version}`}
        onClick={() => setSelected(row)}
      />
    </div>)}
    <div className="company-history-pagination">
      <Button disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
      <span>Page {pagination.page || page} of {pagination.totalPages || 1} · {pagination.total || 0} entries</span>
      <Button disabled={loading || (pagination.page || page) >= (pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)}>Next</Button>
    </div>
    <Modal title={`Staff History Detail: ${selected?.snapshot?.name || '-'}`} visible={Boolean(selected)} footer={null} onCancel={() => setSelected(null)} unmountOnClose>
      <dl className="company-detail-grid">
        {Object.entries(labels).filter(([key]) => key === 'company' || Object.hasOwn(selected?.snapshot || {}, key)).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{valueFor(key, selected?.snapshot?.[key])}</dd></div>)}
      </dl>
    </Modal>
  </div>
}
