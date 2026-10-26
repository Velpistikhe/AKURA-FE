import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Space, Table, TableSearchFilter, Typography } from '../../components/global'
import { money } from './quotationModel'
import { emptyItemFilters, filterQuotationItems } from '../work-order/workOrderModel'

// Second modal of the work order form: lists the quotation lines that are not
// selected yet so the user can add them to the work order in one pass.
export default function QuotationWorkOrderItemPicker({ visible, items = [], excludedIds = [], saving = false, onAdd, onCancel }) {
  const [filters, setFilters] = useState(emptyItemFilters())
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [selectedKeys, setSelectedKeys] = useState([])

  // Lines already added to the work order never appear in this picker.
  const available = useMemo(() => items.filter((item) => !excludedIds.includes(item.itemSizeId)), [items, excludedIds])
  const filtered = useMemo(() => filterQuotationItems(available, filters), [available, filters])

  // Reset the selection whenever the modal opens so a cancelled pick leaves nothing behind.
  useEffect(() => {
    if (!visible) { setSelectedKeys([]); setFilters(emptyItemFilters()); setPage(1) }
  }, [visible])

  // Each column filters its own field from the table header search.
  const searchColumn = (key, label, maxLength = 200) => ({
    key, filteredValue: filters[key] ? [filters[key]] : null,
    filterDropdown: (props) => <TableSearchFilter {...props} placeholder={`Search ${label}`} maxLength={maxLength}
      onSearch={(value) => { setFilters((current) => ({ ...current, [key]: value.trim() })); setPage(1) }} />,
  })
  const columns = [
    { title: 'Service', width: 200, ...searchColumn('serviceName', 'service name'), render: (_, row) => row.serviceName || 'Standalone' },
    { title: 'Item', width: 220, ...searchColumn('itemName', 'item name'), render: (_, row) => row.itemName || '-' },
    { title: 'Size', width: 130, ...searchColumn('size', 'size', 100), render: (_, row) => row.size ?? 'Without size' },
    { title: 'Type', dataIndex: 'serviceType', width: 110, render: (value) => value || '-' },
    { title: 'Inspection Qty', dataIndex: 'quantityInspection', width: 140, align: 'right' },
    { title: 'Maintenance Qty', dataIndex: 'quantityMaintenance', width: 150, align: 'right' },
    { title: 'Subtotal', dataIndex: 'subTotal', width: 140, align: 'right', render: money },
  ]

  const close = () => {
    setSelectedKeys([])
    setFilters(emptyItemFilters())
    setPage(1)
    onCancel()
  }

  return <Modal title="Add Quotation Items" visible={visible} width={1100} zIndex={1200}
    onCancel={() => { if (!saving) close() }} closable={!saving} mask={{ closable: !saving }} keyboard={!saving} unmountOnClose
    footer={<Space>
      <Button onClick={close} disabled={saving}>Cancel</Button>
      <Button variant="primary" disabled={saving || selectedKeys.length === 0}
        onClick={() => {
          const chosen = available.filter((item) => selectedKeys.includes(item.itemSizeId))
          setSelectedKeys([])
          setFilters(emptyItemFilters())
          setPage(1)
          onAdd(chosen)
        }}>Add Items{selectedKeys.length ? ` (${selectedKeys.length})` : ''}</Button>
    </Space>}>
    <p><Typography.Text tone="secondary">Select the quotation items that become work order lines. Quantities are taken from the quotation and cannot be changed here.</Typography.Text></p>
    <Table rowKey="itemSizeId" columns={columns} dataSource={filtered} scroll={{ x: 1100 }}
      locale={{ emptyText: Object.values(filters).some(Boolean) ? 'No quotation items match the filters.' : 'All quotation items are already selected.' }}
      rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys, preserveSelectedRowKeys: true }}
      pagination={{ current: page, pageSize: limit, total: filtered.length, showSizeChanger: true, pageSizeOptions: [10, 20, 50],
        onChange: (next, size) => { setPage(size !== limit ? 1 : next); setLimit(size) } }} />
    <Typography.Text tone="secondary">{filtered.length} of {available.length} available items</Typography.Text>
  </Modal>
}