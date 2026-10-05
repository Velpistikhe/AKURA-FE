import { useEffect, useState } from 'react'
import { Button, Card, Table } from '../../components/global'
import { workOrderService } from '../../services/workOrderService'
import { formatHistoryValue } from './workOrderModel'

const timestamp = (value) => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' }) : '-'

export default function WorkOrderHistory({ id, version }) {
  const [query, setQuery] = useState({ page: 1, limit: 20 })
  const [data, setData] = useState({ history: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    workOrderService.history(id, query).then(({ data: result }) => { if (active) setData(result) })
      .catch((err) => { if (active) { setError(err.message); setData({ history: [], pagination: { total: 0 } }) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, version, query, retry])

  return <Card title="Change History">
    {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry history</Button></div>}
    <Table rowKey="id" busy={loading} dataSource={data.history} scroll={{ x: 600 }}
      columns={[
        { title: 'Version', dataIndex: 'version' },
        { title: 'Action', dataIndex: 'actionLabel', render: (value, row) => value || row.action },
        { title: 'Changed By', render: (_, row) => row.changedBy?.name || row.createdByName || '-' },
        { title: 'Changed At (WIB)', render: (_, row) => timestamp(row.changedAt || row.createdAt) },
      ]}
      expandable={{ expandedRowRender: (entry) => <Table rowKey="field" dataSource={entry.changes || []} pagination={false}
        columns={[
          { title: 'Field', dataIndex: 'label' },
          { title: 'Before', dataIndex: 'before', render: (value) => <div className="work-order-summary">{formatHistoryValue(value)}</div> },
          { title: 'After', dataIndex: 'after', render: (value) => <div className="work-order-summary">{formatHistoryValue(value)}</div> },
        ]} locale={{ emptyText: 'No field changes recorded.' }} /> }}
      pagination={{ current: query.page, pageSize: query.limit, total: data.pagination.total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100],
        onChange: (page, limit) => setQuery((current) => ({ page: limit === current.limit ? page : 1, limit })) }}
      locale={{ emptyText: 'No change history recorded.' }} />
  </Card>
}
