import { useEffect, useState } from 'react'
import { Button, EyeOutlined, Modal, Table, Tag } from '../../components/global'

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : '-'
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${formatValue(item)}`).join(', ')
  return String(value)
}

export default function ServiceHistory({ record, service }) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [data, setData] = useState({ history: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!visible) return
    let active = true
    setLoading(true)
    setError('')
    service.history(record.id, { page, limit }).then((response) => {
      if (active) setData(response.data)
    }).catch((err) => {
      if (active) {
        setError(err.message)
        setData({ history: [], pagination: { total: 0 } })
      }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [record, service, page, limit, retry, visible])

  return <section className="company-view-section catalog-history">
    <div className="catalog-history-heading">
      <h3>Service History</h3>
      <Button variant="link" aria-expanded={visible} onClick={() => setVisible((current) => !current)}>
        {visible ? 'Hide History' : 'Show History'}
      </Button>
    </div>
    <div className={`catalog-history-content${visible ? ' is-visible' : ''}`} aria-hidden={!visible} inert={!visible}>
      <div className="catalog-history-content-inner">
        <div className="catalog-history-list">
          {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
          <Table className="catalog-history-table" rowKey="id" busy={loading} dataSource={data.history}
            tableLayout="fixed" scroll={{ x: 820 }}
            columns={[
              { title: 'Version', dataIndex: 'version', width: 90 },
              { title: 'Action', dataIndex: 'action', width: 240, render: (value) => <Tag>{value}</Tag> },
              { title: 'Changed At', dataIndex: 'changedAt', width: 200, render: (value) => value ? new Date(value).toLocaleString() : '-' },
              { title: 'Changed By', dataIndex: ['changedBy', 'name'], width: 200, render: (value) => value || '-' },
              { title: 'Actions', key: 'actions', width: 90, align: 'center', fixed: 'right', render: (_, row) => (
                <Button variant="text" icon={<EyeOutlined />} title="View Service History"
                  aria-label={`View service history version ${row.version}`} onClick={() => setSelected(row)} />
              ) },
            ]}
            locale={{ emptyText: error ? 'Unable to load history.' : 'No history available.' }}
            pagination={{ current: page, pageSize: limit, total: data.pagination?.total || 0, showSizeChanger: true, responsive: true,
              pageSizeOptions: [10, 20, 50, 100], onChange: (next, size) => { setPage(size !== limit ? 1 : next); setLimit(size) } }}
          />
        </div>
      </div>
    </div>
    <Modal
      title={`Service History Detail: ${record.name}`}
      visible={Boolean(selected)}
      width={800}
      onCancel={() => setSelected(null)}
      footer={<Button onClick={() => setSelected(null)}>Close</Button>}
      unmountOnClose
    >
      <div className="catalog-history-detail">
        <dl className="company-detail-grid">
          <div><dt>Version</dt><dd>{selected?.version ?? '-'}</dd></div>
          <div><dt>Action</dt><dd><Tag>{selected?.action}</Tag></dd></div>
          <div><dt>Changed At</dt><dd>{selected?.changedAt ? new Date(selected.changedAt).toLocaleString() : '-'}</dd></div>
          <div><dt>Changed By</dt><dd>{selected?.changedBy?.name || '-'}</dd></div>
        </dl>
        <Table rowKey="field" dataSource={selected?.changes || []} pagination={false} scroll={{ x: 550 }}
          columns={[
            { title: 'Field', dataIndex: 'label' },
            { title: 'Before', dataIndex: 'before', render: formatValue },
            { title: 'After', dataIndex: 'after', render: formatValue },
          ]}
          locale={{ emptyText: 'No changes recorded.' }}
        />
      </div>
    </Modal>
  </section>
}
