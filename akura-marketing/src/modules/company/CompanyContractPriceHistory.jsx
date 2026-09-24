import { useEffect, useState } from 'react'
import { Button, Modal, Table, Tag } from '../../components/global'
import { contractService } from '../../services/contractService'

function formatValue(value) {
  if (value == null || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function CompanyContractPriceHistory({ price, onClose }) {
  const [closing, setClosing] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [retry, setRetry] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState({ history: [], pagination: { total: 0 } })
  useEffect(() => {
    if (closing) return
    let active = true
    setLoading(true)
    setError('')
    setData({ history: [], pagination: { total: 0 } })
    contractService.priceHistory(price.id, { page, limit }).then(({ data: result }) => {
      if (!active) return
      const lastPage = Math.max(1, result.pagination?.totalPages || 1)
      if (page > lastPage) { setPage(lastPage); return }
      setData(result)
    }).catch((err) => {
      if (active) setError(err.message)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [price.id, page, limit, retry, closing])
  const close = () => setClosing(true)
  const catalog = price.catalogSnapshot || {}
  return <Modal title={`Contract Price History: ${catalog.itemName || price.itemSize?.item?.name || 'Item'} (${catalog.size || price.itemSize?.size || 'No size'})`}
    visible={!closing} width={1000} onCancel={close} afterClose={onClose}
    footer={<Button onClick={close}>Close</Button>} unmountOnClose>
    {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
    <Table rowKey="id" busy={loading} dataSource={data.history} scroll={{ x: 650 }}
      columns={[
        { title: 'Version', dataIndex: 'version', width: 90 },
        { title: 'Action', dataIndex: 'action', render: (value) => <Tag>{value}</Tag> },
        { title: 'Changed At', dataIndex: 'changedAt', render: (value) => value ? new Date(value).toLocaleString() : '-' },
        { title: 'Changed By', dataIndex: ['changedBy', 'name'], render: (value) => value || '-' },
      ]}
      expandable={{ expandedRowRender: (row) => <Table rowKey="field" dataSource={row.changes || []} pagination={false}
        scroll={{ x: 500 }} columns={[
          { title: 'Field', dataIndex: 'label' },
          { title: 'Before', dataIndex: 'before', render: formatValue },
          { title: 'After', dataIndex: 'after', render: formatValue },
        ]} locale={{ emptyText: 'No field changes recorded.' }} /> }}
      locale={{ emptyText: error ? 'Unable to load history.' : 'No history available.' }}
      pagination={{ current: page, pageSize: limit, total: data.pagination?.total || 0, showSizeChanger: true,
        pageSizeOptions: [10, 20, 50, 100], onChange: (next, size) => { setPage(size !== limit ? 1 : next); setLimit(size) } }} />
  </Modal>
}
