import { useEffect, useState } from 'react'
import { Button, Table, Tag } from '../../components/global'
import { companyService } from '../../services/companyService'
import { companyStaffService } from '../../services/companyStaffService'

const labels = { name: 'Name', type: 'Type', address: 'Address', npwp: 'NPWP', isSisterCompany: 'Sister Company', title: 'Title', telp: 'Phone', email: 'Email', company: 'Company', revoked: 'Deactivated' }

function formatSnapshotValue(key, value) {
  if (key === 'company') return value?.name || '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value ?? '-'
}

export default function CompanyHistory({ entityId, staff = false, staffHistoryForCompany = false, revision = 0 }) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [data, setData] = useState({ history: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const history = staffHistoryForCompany ? companyService.staffHistory : (staff ? companyStaffService.history : companyService.history)
    history(entityId, { page, limit }).then((response) => {
      if (active) setData(response.data)
    }).catch((err) => {
      if (active) { setError(err.message); setData({ history: [], pagination: { total: 0 } }) }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [entityId, staff, staffHistoryForCompany, page, limit, revision, retry])
  return <section className="company-history">
    {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
    <Table rowKey="id" busy={loading} dataSource={data.history} scroll={{ x: 700 }}
      columns={[
        { title: 'Version', dataIndex: 'version', width: 90 },
        { title: 'Action', dataIndex: 'action', render: (value) => <Tag>{value}</Tag> },
        { title: 'Changed At', dataIndex: 'createdAt', render: (value) => value ? new Date(value).toLocaleString() : '-' },
        { title: 'Changed By', dataIndex: 'createdByName', render: (value) => value || '-' },
      ]}
      expandable={{ expandedRowRender: (row) => <dl className="company-detail-grid">
        {Object.entries(labels).filter(([key]) => (staff && key === 'company') || Object.hasOwn(row.snapshot || {}, key)).map(([key, label]) => <div key={key}>
          <dt>{label}</dt><dd>{formatSnapshotValue(key, row.snapshot[key])}</dd>
        </div>)}
      </dl> }}
      locale={{ emptyText: error ? 'Unable to load history.' : 'No history available.' }}
      pagination={{ current: page, pageSize: limit, total: data.pagination?.total || 0, showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100], onChange: (next, size) => { setPage(size !== limit ? 1 : next); setLimit(size) } }} />
  </section>
}
