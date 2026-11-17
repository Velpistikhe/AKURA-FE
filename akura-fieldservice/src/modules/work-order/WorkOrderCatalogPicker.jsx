import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Space, Table } from '../../components/global'
import TableSearchFilter from '../../components/global/TableSearchFilter'
import { workOrderService } from '../../services/workOrderService'

export default function WorkOrderCatalogPicker({ excludedIds, onAdd, onClose }) {
  const [query, setQuery] = useState({ page: 1, limit: 20 })
  const [data, setData] = useState({ sizes: [], pagination: { total: 0 } })
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const excluded = useMemo(() => new Set(excludedIds), [excludedIds])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      workOrderService.itemSizes(query).then(({ data: result }) => {
        if (!active) return
        if (!Array.isArray(result?.sizes) || !result.pagination) throw new Error('Invalid catalog options response.')
        setData(result)
      }).catch((err) => { if (active) { setError(err.message); setData({ sizes: [], pagination: { total: 0 } }) } })
        .finally(() => { if (active) setLoading(false) })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [query, retry])
  const searchColumn = (key, title) => ({
    key, title, filteredValue: query[key] ? [query[key]] : null,
    filterDropdown: (props) => <TableSearchFilter {...props} placeholder={`Search ${title.toLowerCase()}`} maxLength={key === 'size' ? 100 : 200} />,
  })
  return <Modal title="Add Catalog Items" visible width={900} zIndex={1200} onCancel={onClose} unmountOnClose footer={<Space>
    <Button onClick={onClose}>Cancel</Button>
    <Button variant="primary" disabled={loading || Boolean(error) || !selected.length} onClick={() => onAdd(selected.map((row) => ({
      itemSizeId: row.id, itemName: row.item?.name || 'Item', serviceName: row.item?.service?.name || '',
      size: row.size, selected: true, quantityInspection: '0', quantityMaintenance: '0',
    })))}>Add Items ({selected.length})</Button>
  </Space>}>
    {error && <div role="alert">{error} <Button onClick={() => setRetry((current) => current + 1)}>Retry items</Button></div>}
    <Table rowKey="id" busy={loading} dataSource={data.sizes} columns={[
      { ...searchColumn('serviceName', 'Service'), render: (_, row) => row.item?.service?.name || 'Standalone' },
      { ...searchColumn('itemName', 'Item'), render: (_, row) => row.item?.name || '-' },
      { ...searchColumn('size', 'Size'), dataIndex: 'size', render: (value) => value ?? 'Without size' },
    ]} rowSelection={{ selectedRowKeys: selected.map((row) => row.id), preserveSelectedRowKeys: true,
      onChange: (_, rows) => setSelected(rows.filter(Boolean)), getCheckboxProps: (row) => ({ disabled: loading || Boolean(error) || excluded.has(row.id) }) }}
      onChange={(_, filters, _sorter, extra) => {
        if (extra.action === 'filter') setQuery((current) => ({ ...current, page: 1, serviceName: filters.serviceName?.[0], itemName: filters.itemName?.[0], size: filters.size?.[0] }))
      }} pagination={{ current: query.page, pageSize: query.limit, total: data.pagination.total, showSizeChanger: true,
        onChange: (page, limit) => setQuery((current) => ({ ...current, page: limit === current.limit ? page : 1, limit })) }} />
  </Modal>
}
