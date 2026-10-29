import { useEffect, useState } from 'react'
import { Alert, Typography } from 'antd'
import { Button, Modal } from '../../components/FinanceControls'
import { Table } from '../../components/ResponsiveTable'
import TableSearchFilter from '../../components/global/TableSearchFilter'
import { documentOptionService } from '../../services/documentOptionService'
import { documentOptionValues, money } from './documentModel'

export default function DocumentItemPicker({ companyId, selectedIds, disabled, onSelect, onCancel }) {
  const [query, setQuery] = useState({ page: 1, limit: 20, itemName: '', serviceName: '', size: '' })
  const [data, setData] = useState({ sizes: [], pagination: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const exclude = selectedIds.join(',')
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    const timer = setTimeout(() => {
      documentOptionService.items({ ...query, companyId, exclude }).then(response => {
        if (active) {
          setData(response.data)
          if (!response.data.sizes.length && query.page > 1) setQuery(value => ({ ...value, page: Math.max(1, response.data.pagination.totalPages) }))
        }
      }).catch(err => { if (active) { setError(err.message); setData({ sizes: [], pagination: {} }) } })
        .finally(() => { if (active) setLoading(false) })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [companyId, query, exclude, retry])
  const searchColumn = key => ({ key, filteredValue: query[key] ? [query[key]] : null,
    filterDropdown: props => <TableSearchFilter {...props} placeholder={`Search ${key === 'size' ? 'size' : key === 'itemName' ? 'item' : 'service'}`} maxLength={key === 'size' ? 100 : 200} /> })
  return <Modal title="Select Document Item" open width={1100} footer={null} onCancel={onCancel}>
    <Typography.Paragraph type="secondary">Choose items using the company's current prices. Final prices are confirmed when the document is saved.</Typography.Paragraph>
    {error && <Alert type="error" showIcon title="Unable to load items" description={error} action={<Button onClick={() => setRetry(value => value + 1)}>Retry</Button>} />}
    <Table rowKey="id" loading={loading} dataSource={data.sizes.filter(row => !selectedIds.includes(row.id))} scroll={{ x: 950 }} pagination={{ current: query.page, pageSize: query.limit, total: data.pagination.total || 0, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], onChange: (page, limit) => { setLoading(true); setQuery(value => ({ ...value, page: limit !== value.limit ? 1 : page, limit })) } }}
      onChange={(_, filters, sorter, extra) => {
        if (extra.action === 'paginate') return
        setLoading(true)
        setQuery(value => ({ ...value, page: 1, itemName: (filters.itemName?.[0] || '').trim(), serviceName: (filters.serviceName?.[0] || '').trim(), size: (filters.size?.[0] || '').trim(), sortBy: sorter.order ? 'size' : undefined, sortOrder: sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : undefined }))
      }} columns={[
        { title: 'Service', ...searchColumn('serviceName'), render: (_, row) => row.catalogSnapshot?.serviceName || row.item?.service?.name || 'Standalone' },
        { title: 'Item', ...searchColumn('itemName'), render: (_, row) => row.catalogSnapshot?.itemName ?? row.item?.name },
        { title: 'Size', ...searchColumn('size'), sorter: true, sortOrder: query.sortOrder ? (query.sortOrder === 'asc' ? 'ascend' : 'descend') : null, render: (_, row) => (row.catalogSnapshot ? row.catalogSnapshot.size : row.size) ?? 'Without size' },
        { title: 'Inspection Estimate', render: (_, row) => money(row.priceInspection ?? row.priceService) },
        { title: 'Maintenance Estimate', dataIndex: 'priceMaintenance', render: money },
        { title: 'Action', render: (_, row) => <Button type="primary" disabled={disabled || loading || Boolean(error) || selectedIds.includes(row.id) || !documentOptionValues(row)} onClick={() => onSelect(row)}>Select Item</Button> },
      ]} />
  </Modal>
}
