import { useEffect, useId, useState } from 'react'
import { Button, Card, EyeOutlined, Modal, Table, TableSearchFilter, Tag, Typography } from '../../components/global'
import { quotationService } from '../../services/quotationService'
import { displayEnum, quotationNumber } from './quotationModel'
import { loadQuotationHistory } from './quotationHistoryModel'
import '../service/ServiceCatalogPage.css'

function HistoryValue({ value }) {
  if (value == null) return <Typography.Text tone="secondary">Not set</Typography.Text>
  if (value === '') return <Typography.Text tone="secondary">Empty</Typography.Text>
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length
    ? <ol className="quotation-change-list">{value.map((item, index) => <li key={index}><HistoryValue value={item} /></li>)}</ol>
    : <Typography.Text tone="secondary">No items</Typography.Text>
  if (typeof value === 'object') return Object.keys(value).length
    ? <dl className="quotation-change-object">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')}</dt><dd><HistoryValue value={item} /></dd></div>)}</dl>
    : <Typography.Text tone="secondary">No details</Typography.Text>
  return String(value)
}

function Changes({ changes }) {
  return <Table rowKey="field" dataSource={changes} pagination={false} tableLayout="fixed" scroll={{ x: 550 }}
    columns={[
      { title: 'Field', dataIndex: 'label', width: '24%', render: (value, row) => value || row.field },
      { title: 'Before', dataIndex: 'before', width: '38%', render: (value) => <HistoryValue value={value} /> },
      { title: 'After', dataIndex: 'after', width: '38%', render: (value) => <HistoryValue value={value} /> },
    ]} locale={{ emptyText: 'No changes recorded.' }} />
}

export default function QuotationHistory({ record }) {
  const contentId = useId()
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState({ page: 1, limit: 20, action: '', sortBy: 'version', sortOrder: 'desc' })
  const [data, setData] = useState({ history: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  useEffect(() => {
    if (!visible) return
    let active = true
    setLoading(true)
    setError('')
    setData({ history: [], pagination: { total: 0 } })
    loadQuotationHistory(record.id, query, quotationService.history, () => active).then((result) => {
      if (!active) return
      const lastPage = Math.max(1, result.pagination?.totalPages || 1)
      if (query.page > lastPage) setQuery((current) => ({ ...current, page: lastPage }))
      else setData(result)
    }).catch((err) => { if (active) setError(err.message || 'Unable to load quotation history.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [record.id, record.version, query, visible, retry])
  const sortColumn = (key) => ({ sorter: true, sortOrder: query.sortBy === key ? (query.sortOrder === 'asc' ? 'ascend' : 'descend') : null })
  const filterColumn = (key, placeholder, maxLength = 100) => ({
    filteredValue: query[key] ? [query[key]] : null,
    filterDropdown: (props) => <TableSearchFilter {...props} placeholder={placeholder} maxLength={maxLength} />,
  })
  return <section className="company-view-section catalog-history quotation-history">
    <div className="catalog-history-heading"><h3>Quotation History</h3><Button variant="link" aria-expanded={visible} aria-controls={contentId} onClick={() => setVisible((current) => !current)}>{visible ? 'Hide History' : 'Show History'}</Button></div>
    <div id={contentId} className={`catalog-history-content${visible ? ' is-visible' : ''}`} aria-hidden={!visible} inert={!visible}>
      <div className="catalog-history-content-inner"><div className="catalog-history-list">
        {error && <div role="alert"><Typography.Text tone="danger">{error}</Typography.Text> <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
        <Table className="catalog-history-table" rowKey="id" busy={loading} dataSource={data.history} tableLayout="fixed" scroll={{ x: 800 }}
          columns={[
            { title: 'Version', dataIndex: 'version', width: '25%', className: 'quotation-history-cell', ...sortColumn('version'), ...filterColumn('versionFilter', 'Search version') },
            { title: 'Action', dataIndex: 'action', width: '25%', className: 'quotation-history-cell', ...sortColumn('action'), ...filterColumn('action', 'Action (e.g. SUBMIT)', 20), render: (value) => <Tag>{displayEnum(value)}</Tag> },
            { title: 'Changed At', dataIndex: 'createdAt', width: '25%', className: 'quotation-history-cell', ...sortColumn('createdAt'), ...filterColumn('dateFilter', 'Search date (YYYY-MM-DD) or time'), render: (value) => value ? new Date(value).toLocaleString() : '-' },
            { title: 'Changed By', dataIndex: 'createdByName', width: '25%', className: 'quotation-history-cell', ...filterColumn('nameFilter', 'Search user name'), render: (value, row) => value || row.createdBy?.name || '-' },
            { title: 'Actions', key: 'actions', width: 90, align: 'center', fixed: 'right', render: (_, row) => <Button variant="text" icon={<EyeOutlined />} title="View Quotation History" aria-label={`View quotation history version ${row.version}`} onClick={() => { setSelected(row); setDetailOpen(true) }} /> },
          ]}
          pagination={{ current: query.page, pageSize: query.limit, total: data.pagination?.total || 0, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], showTotal: (total) => `${total} history entries` }}
          onChange={(pagination, filters, sorter, extra) => setQuery((current) => ({ ...current,
            page: pagination.pageSize !== current.limit || extra.action !== 'paginate' ? 1 : pagination.current,
            limit: pagination.pageSize,
            ...(extra.action === 'filter' ? {
              versionFilter: String(filters.version?.[0] || '').trim(), action: String(filters.action?.[0] || '').trim().toUpperCase(),
              dateFilter: String(filters.createdAt?.[0] || '').trim(), nameFilter: String(filters.createdByName?.[0] || '').trim(),
            } : {}),
            ...(extra.action === 'sort' ? { sortBy: sorter.order ? sorter.field : 'version', sortOrder: sorter.order === 'ascend' ? 'asc' : 'desc' } : {}),
          }))}
          locale={{ emptyText: error ? 'Unable to load history.' : 'No quotation history found.' }} />
      </div></div>
    </div>
    <Modal title={`Quotation History Detail: ${quotationNumber(record)}`} visible={detailOpen} width={800} onCancel={() => setDetailOpen(false)}
      afterClose={() => { if (!detailOpen) setSelected(null) }} footer={<Button onClick={() => setDetailOpen(false)}>Close</Button>} unmountOnClose>
      <div className="catalog-history-detail quotation-history-detail">
        <Card title="History Information"><dl className="company-detail-grid">
          <div><dt>Version</dt><dd>{selected?.version ?? '-'}</dd></div>
          <div><dt>Action</dt><dd><Tag>{displayEnum(selected?.action)}</Tag></dd></div>
          <div><dt>Changed At</dt><dd>{selected?.createdAt ? new Date(selected.createdAt).toLocaleString() : '-'}</dd></div>
          <div><dt>Changed By</dt><dd>{selected?.createdByName || selected?.createdBy?.name || '-'}</dd></div>
        </dl></Card>
        <Card title="Field Changes"><Changes changes={Array.isArray(selected?.changes) ? selected.changes : []} /></Card>
      </div>
    </Modal>
  </section>
}
