import { useEffect, useState } from 'react'
import { Button, Card, Table, Tag, Typography } from '../../components/global'
import { userService } from '../../services/userService'

const TARGET_SERVICES = [
  { value: 'marketing-service', label: 'Marketing' },
  { value: 'fieldservice-service', label: 'Field Service' },
]

function timestamp(value) {
  return value ? new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '—'
}

function targetName(value) {
  return TARGET_SERVICES.find((target) => target.value === value)?.label || value
}

export default function UserSyncStatus() {
  const [query, setQuery] = useState({ page: 1, limit: 20, status: '', targetService: '' })
  const [deliveries, setDeliveries] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    userService.syncDeliveries(query)
      .then((response) => {
        if (!active) return
        setDeliveries(response.data?.deliveries || [])
        setPagination(response.data?.pagination || { page: query.page, total: 0, totalPages: 1 })
      })
      .catch((loadError) => {
        if (!active) return
        setDeliveries([])
        setPagination({ page: query.page, total: 0, totalPages: 1 })
        setError(loadError.message)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [query, reload])

  const columns = [
    {
      title: 'User ID',
      dataIndex: ['event', 'userId'],
      key: 'userId',
      render: (value) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: 'Target Service',
      dataIndex: 'targetService',
      key: 'targetService',
      filters: TARGET_SERVICES.map(({ value, label }) => ({ text: label, value })),
      filterMultiple: false,
      filteredValue: query.targetService ? [query.targetService] : null,
      render: targetName,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [{ text: 'Pending', value: 'pending' }, { text: 'Delivered', value: 'delivered' }],
      filterMultiple: false,
      filteredValue: query.status ? [query.status] : null,
      render: (status) => <Tag color={status === 'delivered' ? 'success' : 'warning'}>{status === 'delivered' ? 'Delivered' : 'Pending'}</Tag>,
    },
    { title: 'Attempts', dataIndex: 'attempts', width: 100 },
    {
      title: 'Last Error',
      dataIndex: 'lastError',
      render: (value) => value
        ? <div style={{ maxWidth: 360, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{value}</div>
        : '—',
    },
    {
      title: 'Next Retry (WIB)',
      dataIndex: 'nextRetryAt',
      render: (value, delivery) => delivery.status === 'pending' ? timestamp(value) : '—',
    },
    {
      title: 'Delivered At (WIB)',
      dataIndex: 'deliveredAt',
      render: timestamp,
    },
    { title: 'Event Version', dataIndex: ['event', 'version'], width: 120 },
    {
      title: 'Event Created (WIB)',
      dataIndex: ['event', 'createdAt'],
      render: timestamp,
    },
  ]

  return <Card title="User Sync Deliveries" extra={<Button onClick={() => setReload((value) => value + 1)} disabled={loading}>Refresh</Button>}>
    <Typography.Text tone="secondary" style={{ display: 'block', marginBottom: 16 }}>
      Pending deliveries retry automatically. Loading this list also attempts up to five due retries. The list is global across branches.
    </Typography.Text>
    {error && <div role="alert" style={{ marginBottom: 16 }}>{error}</div>}
    <Table
      rowKey="id"
      busy={loading}
      columns={columns}
      dataSource={deliveries}
      scroll={{ x: 1500 }}
      onChange={(tablePagination, filters) => setQuery((current) => {
        const status = filters.status?.[0] || ''
        const targetService = filters.targetService?.[0] || ''
        const filtersChanged = status !== current.status || targetService !== current.targetService
        const pageSizeChanged = tablePagination.pageSize && tablePagination.pageSize !== current.limit
        return {
          ...current,
          page: filtersChanged || pageSizeChanged ? 1 : tablePagination.current || 1,
          limit: tablePagination.pageSize || current.limit,
          status,
          targetService,
        }
      })}
      pagination={{
        current: pagination.page,
        pageSize: pagination.limit,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100],
      }}
      locale={{ emptyText: error ? 'Sync delivery status unavailable.' : 'No matching user sync deliveries.' }}
    />
  </Card>
}
