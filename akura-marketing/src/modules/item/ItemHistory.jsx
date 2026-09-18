import { useEffect, useState } from 'react'
import { Button, Card, EyeOutlined, Modal, Table, Tag } from '../../components/global'
import { itemService } from '../../services/itemService'
import { loadSizeHistory } from './itemHistoryModel'

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : '-'
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${formatValue(item)}`).join(', ')
  return String(value)
}

export default function ItemHistory({ record, scope = 'item', expanded = false, revision = 0 }) {
  const title = scope === 'price' ? 'Price' : scope === 'size' ? 'Size' : 'Item'
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [data, setData] = useState({ history: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const visible = expanded || showHistory
  const requestPage = scope === 'size' ? 1 : page
  const requestLimit = scope === 'size' ? 100 : limit

  useEffect(() => {
    if (!visible) return
    let active = true
    setLoading(true)
    setError('')
    const request = scope === 'size'
      ? loadSizeHistory(record.id, itemService.sizeHistory, () => active)
      : (scope === 'price' ? itemService.priceHistory : itemService.history)(record.id, { page: requestPage, limit: requestLimit }).then((response) => response.data)
    request.then((result) => {
      if (!active) return
      if (scope === 'size') {
        setData(result)
        setPage(1)
        return
      }
      const lastPage = Math.max(1, result.pagination.totalPages)
      if (requestPage > lastPage) {
        setPage(lastPage)
        return
      }
      setData(result)
    }).catch((err) => {
      if (active) {
        setError(err.message)
        setData({ history: [], pagination: { total: 0 } })
      }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [record.id, record.version, scope, requestPage, requestLimit, retry, visible, revision])

  return <section className="company-view-section catalog-history">
    <div className="catalog-history-heading">
      <h3>{title} History</h3>
      {!expanded && <Button variant="link" aria-expanded={visible} onClick={() => setShowHistory((current) => !current)}>
        {visible ? 'Hide History' : 'Show History'}
      </Button>}
    </div>
    <div className={`catalog-history-content${visible ? ' is-visible' : ''}`} aria-hidden={!visible} inert={!visible}>
      <div className="catalog-history-content-inner">
        <div className="catalog-history-list">
          {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
          <Table className="catalog-history-table" rowKey="id" busy={loading} dataSource={data.history}
            tableLayout="fixed" scroll={{ x: 1000 }}
            columns={[
              { title: 'Entity', dataIndex: 'entityType', width: 180 },
              { title: 'Version', dataIndex: 'version', width: 90 },
              { title: 'Action', dataIndex: 'actionLabel', width: 240, render: (value) => <Tag>{value}</Tag> },
              { title: 'Changed At', dataIndex: 'changedAt', width: 200, render: (value) => value ? new Date(value).toLocaleString() : '-' },
              { title: 'Changed By', dataIndex: ['changedBy', 'name'], width: 200, render: (value) => value || '-' },
              { title: 'Actions', key: 'actions', width: 90, align: 'center', fixed: 'right', render: (_, row) => (
                <Button variant="text" icon={<EyeOutlined />} title={`View ${title} History`}
                  aria-label={`View history version ${row.version}`} onClick={() => { setSelected(row); setDetailOpen(true) }} />
              ) },
            ]}
            locale={{ emptyText: error ? 'Unable to load history.' : scope === 'price' ? 'No standard price history for this size yet.' : `No ${title.toLowerCase()} history available.` }}
            pagination={{ current: page, pageSize: limit, total: data.pagination?.total || 0, showSizeChanger: true, responsive: true,
              hideOnSinglePage: data.pagination?.total === 0,
              pageSizeOptions: [10, 20, 50, 100], onChange: (next, size) => { setPage(size !== limit ? 1 : next); setLimit(size) } }}
          />
        </div>
      </div>
    </div>
    <Modal
      title={`${title} History Detail: ${record.name}`}
      visible={detailOpen}
      width={800}
      onCancel={() => setDetailOpen(false)}
      afterClose={() => { if (!detailOpen) setSelected(null) }}
      footer={<Button onClick={() => setDetailOpen(false)}>Close</Button>}
      unmountOnClose
    >
      <div className="catalog-history-detail item-history-detail">
        <Card title="History Information">
        <dl className="company-detail-grid">
          <div><dt>Entity</dt><dd>{selected?.entityType || '-'}</dd></div>
          <div><dt>Version</dt><dd>{selected?.version ?? '-'}</dd></div>
          <div><dt>Action</dt><dd><Tag>{selected?.actionLabel}</Tag></dd></div>
          <div><dt>Changed At</dt><dd>{selected?.changedAt ? new Date(selected.changedAt).toLocaleString() : '-'}</dd></div>
          <div><dt>Changed By</dt><dd>{selected?.changedBy?.name || '-'}</dd></div>
        </dl>
        </Card>
        <Card title="Field Changes">
        <Table rowKey="field" dataSource={selected?.changes || []} pagination={false} scroll={{ x: 550 }}
          columns={[
            { title: 'Field', dataIndex: 'label' },
            { title: 'Before', dataIndex: 'before', render: formatValue },
            { title: 'After', dataIndex: 'after', render: formatValue },
          ]}
          locale={{ emptyText: 'No changes recorded.' }}
        />
        </Card>
      </div>
    </Modal>
  </section>
}
