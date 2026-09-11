import { useEffect, useState } from 'react'
import { Button, Input, Modal, Table, Typography } from '../../components/global'
import { itemService } from '../../services/itemService'
import { loadAll, money } from './quotationModel'

export default function QuotationItemPicker({ visible, companyId, selectedSizeIds = [], onSelect, onCancel, afterClose }) {
  const [filters, setFilters] = useState({ itemName: '', serviceName: '', size: '' })
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!visible || !companyId) return
    let active = true
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      loadAll(itemService.listPrices, 'sizes', { ...filters, companyId })
        .then((sizes) => { if (active) setRows(sizes) })
        .catch((err) => { if (active) { setError(err.message); setRows([]) } })
        .finally(() => { if (active) setLoading(false) })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [companyId, filters, retry, visible])
  const selectedIds = new Set(selectedSizeIds)
  const availableRows = rows.filter((row) => !selectedIds.has(row.id))
  const columns = [
    { title: 'Service', dataIndex: ['item', 'service', 'name'] },
    { title: 'Type', dataIndex: ['item', 'service', 'type'] },
    { title: 'Item', dataIndex: ['item', 'name'] },
    { title: 'Size', dataIndex: 'size' },
    { title: 'Service Price', dataIndex: 'priceService', render: money },
    { title: 'Maintenance Price', dataIndex: 'priceMaintenance', render: money },
    { title: 'Price Source', dataIndex: 'priceSource' },
    { title: 'Availability', dataIndex: 'priceStatus', render: (value, row) => <span title={row.priceMessage || undefined}>{value}</span> },
    { title: 'Action', key: 'action', render: (_, row) => <Button variant="primary" disabled={!visible || !companyId || loading || Boolean(error) || row.priceStatus !== 'AVAILABLE' || row.priceService == null} onClick={() => onSelect(row)}>Select</Button> },
  ]
  return <Modal title="Select Quotation Item" visible={visible} width={1100} footer={null} onCancel={onCancel} afterClose={afterClose}>
    <div className="quotation-item-filters">
      {Object.entries({ itemName: 'Item name', serviceName: 'Service name', size: 'Size' }).map(([key, label]) => <Input key={key} aria-label={label} placeholder={label} allowClear maxLength={key === 'size' ? 100 : 200} value={filters[key]} onChange={(event) => { setLoading(true); setFilters((current) => ({ ...current, [key]: event.target.value })); setPage(1) }} />)}
    </div>
    {error && <div role="alert"><Typography.Text tone="danger">{error}</Typography.Text> <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
    <Table rowKey="id" columns={columns} dataSource={availableRows} busy={loading} scroll={{ x: 950 }} locale={{ emptyText: error ? 'Unable to load items.' : 'No unselected items found.' }} pagination={{ current: Math.min(page, Math.max(1, Math.ceil(availableRows.length / 20))), pageSize: 20, total: availableRows.length, showSizeChanger: false, onChange: setPage }} />
  </Modal>
}
