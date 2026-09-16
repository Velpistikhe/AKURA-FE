import { useEffect, useState } from 'react'
import { Button, Modal, Table, TableSearchFilter, Typography } from '../../components/global'
import { itemService } from '../../services/itemService'
import { money, quotationOptionValues } from './quotationModel'

export default function QuotationItemPicker({ visible, companyId, selectedSizeIds = [], onSelect, onCancel, afterClose }) {
  const [filters, setFilters] = useState({ itemName: '', serviceName: '', size: '' })
  const [sortOrder, setSortOrder] = useState(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [data, setData] = useState({ sizes: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const exclude = selectedSizeIds.join(',')
  useEffect(() => {
    if (!visible || !companyId) return
    let active = true
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      itemService.listPrices({ ...Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, value.trim()])), companyId, exclude, page, limit,
        sortBy: sortOrder ? 'size' : undefined, sortOrder: sortOrder ? (sortOrder === 'ascend' ? 'asc' : 'desc') : undefined })
        .then((response) => {
          if (!active) return
          const result = response.data
          if (!result.sizes.length && page > 1) setPage(Math.max(1, result.pagination.totalPages))
          setData(result)
        })
        .catch((err) => { if (active) { setError(err.message); setData({ sizes: [], pagination: { total: 0 } }) } })
        .finally(() => { if (active) setLoading(false) })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [companyId, filters, sortOrder, exclude, page, limit, retry, visible])
  const disabled = !visible || !companyId || loading || Boolean(error)
  const searchColumn = (key, label) => ({
    key, filteredValue: filters[key] ? [filters[key]] : null,
    filterDropdown: (props) => <TableSearchFilter {...props} placeholder={`Search ${label}`} maxLength={key === 'size' ? 100 : 200} />,
  })
  const columns = [
    { title: 'Service', ...searchColumn('serviceName', 'service name'), render: (_, row) => row.catalogSnapshot?.serviceName ?? row.item?.service?.name },
    { title: 'Item', ...searchColumn('itemName', 'item name'), render: (_, row) => row.catalogSnapshot?.itemName ?? row.item?.name },
    { title: 'Size', ...searchColumn('size', 'size'), sorter: true, sortOrder, render: (_, row) => row.catalogSnapshot?.size ?? row.size },
    { title: 'Inspection Estimate', render: (_, row) => money(row.priceInspection ?? row.priceService) },
    { title: 'Maintenance Estimate', dataIndex: 'priceMaintenance', render: money },
    { title: 'Select', key: 'action', render: (_, row) => <Button variant="primary" disabled={disabled || !quotationOptionValues(row)} onClick={() => onSelect(row)}>Select Item</Button> },
  ]
  return <Modal title="Select Quotation Item" visible={visible} width={1100} footer={null} onCancel={onCancel} afterClose={afterClose}>
    <p><Typography.Text tone="secondary">Items covered by the company's active contract are excluded. Prices use the company's standard or sister-company rate and are recalculated when saved.</Typography.Text></p>
    {error && <div role="alert"><Typography.Text tone="danger">{error}</Typography.Text> <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
    <Table rowKey="id" columns={columns} dataSource={data.sizes} busy={loading} scroll={{ x: 950 }} locale={{ emptyText: error ? 'Unable to load items.' : 'No unselected items found.' }}
      onChange={(_, nextFilters, sorter, extra) => {
        if (extra.action === 'paginate') return
        setLoading(true)
        setFilters({ itemName: nextFilters.itemName?.[0] || '', serviceName: nextFilters.serviceName?.[0] || '', size: nextFilters.size?.[0] || '' })
        setSortOrder(sorter.order || null)
        setPage(1)
      }}
      pagination={{ current: page, pageSize: limit, total: data.pagination.total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], onChange: (next, size) => { setLoading(true); setPage(size !== limit ? 1 : next); setLimit(size) } }} />
  </Modal>
}
