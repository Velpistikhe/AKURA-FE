import { useEffect, useRef, useState } from 'react'
import { Button, Card, Table, Tag, Typography } from '../../components/global'
import { watchWorkOrderSync } from './workOrderSyncModel'

const timestamp = (value) => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' }) : '-'
const statusColors = { DELIVERED: 'success', PENDING: 'processing', RETRYING: 'warning' }
const noWrapCell = () => ({ style: { whiteSpace: 'nowrap' } })

export default function WorkOrderSync({ id, version, onDelivered }) {
  const [query, setQuery] = useState({ page: 1, limit: 20 })
  const [response, setResponse] = useState({ data: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const callback = useRef(onDelivered)
  const delivered = useRef(null)
  useEffect(() => { callback.current = onDelivered }, [onDelivered])
  useEffect(() => {
    setLoading(true)
    setError('')
    setResponse({ data: [], pagination: { total: 0 } })
    return watchWorkOrderSync(id, query, {
      onData: (result) => {
        setResponse(result)
        setLoading(false)
        const latest = result.data[0]
        if (query.page === 1 && latest?.delivery?.deliveryStatus === 'DELIVERED'
          && latest.eventId !== delivered.current) {
          delivered.current = latest.eventId
          callback.current?.()
        }
      },
      onError: (err) => { setError(err.message); setLoading(false) },
    })
  }, [id, version, query, retry])

  return <Card title="Quotation Status Sync" extra={<Button disabled={loading} onClick={() => setRetry((value) => value + 1)}>Refresh sync</Button>}>
    <p><Typography.Text>Work order creation is saved independently of quotation synchronisation. Pending deliveries refresh automatically every 5 seconds; failed attempts are retried by the server.</Typography.Text></p>
    {error && <div role="alert">{error}</div>}
    <Table rowKey={(row) => `${row.eventId}:${row.delivery.id}`} busy={loading} dataSource={response.data} scroll={{ x: 'max-content' }}
      columns={[
        { title: 'Action', dataIndex: 'action' },
        { title: 'Work Order Status', dataIndex: 'workOrderStatus' },
        { title: 'Link Update', render: (_, row) => row.revoked ? 'Clear link' : 'Set link' },
        { title: 'Target', render: (_, row) => row.delivery.targetService },
        { title: 'Delivery', render: (_, row) => <Tag color={statusColors[row.delivery.deliveryStatus]}>{row.delivery.deliveryStatus}</Tag> },
        { title: 'Attempts', render: (_, row) => row.delivery.attempts },
        { title: 'Created (WIB)', dataIndex: 'createdAt', onCell: noWrapCell, onHeaderCell: noWrapCell, render: timestamp },
        { title: 'Delivered (WIB)', onCell: noWrapCell, onHeaderCell: noWrapCell, render: (_, row) => timestamp(row.delivery.deliveredAt) },
        { title: 'Next Retry (WIB)', onCell: noWrapCell, onHeaderCell: noWrapCell, render: (_, row) => row.delivery.deliveredAt ? '-' : timestamp(row.delivery.nextRetryAt) },
        { title: 'Last Error', onCell: noWrapCell, onHeaderCell: noWrapCell, render: (_, row) => row.delivery.lastError || '-' },
      ]}
      locale={{ emptyText: error ? 'Unable to load synchronisation records.' : 'No quotation synchronisation recorded. Standalone work orders do not sync a quotation.' }}
      pagination={{ current: query.page, pageSize: query.limit, total: response.pagination.total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100],
        onChange: (page, limit) => setQuery((current) => ({ page: current.limit === limit ? page : 1, limit })) }} />
  </Card>
}
