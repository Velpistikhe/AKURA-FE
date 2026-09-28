import { Button, Input, InputNumber, Space, Typography } from '../../components/global'

export const QUOTATION_STATUSES = ['CREATED', 'SUBMITTED', 'REJECTED', 'APPROVED', 'REVISED', 'CONFIRMED', 'ON_PROGRESS', 'WORK_ORDER_COMPLETE', 'COMPLETE']
export const QUOTATION_INVOICE_STATUSES = ['CREATED', 'SEND', 'APPROVED', 'COMPLETE', 'CANCELED', 'EXPIRED']

export function QuotationNumberFilter({ selectedKeys, setSelectedKeys, confirm, clearFilters }) {
  const value = selectedKeys[0]
  const valid = value == null || (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 2147483647)
  return <div className="table-filter-dropdown" style={{ padding: 8 }} onKeyDown={(event) => event.stopPropagation()}>
    <InputNumber aria-label="Filter quotation number" placeholder="Quotation number" value={value} min={1} max={2147483647} precision={0}
      onChange={(next) => setSelectedKeys(next == null ? [] : [String(next)])} onPressEnter={() => { if (valid) confirm() }} />
    <Space><Button size="small" variant="primary" disabled={!valid} onClick={() => confirm()}>Apply</Button><Button size="small" onClick={() => { clearFilters?.(); setSelectedKeys([]); confirm() }}>Reset</Button></Space>
  </div>
}

export function QuotationDateFilter({ selectedKeys, setSelectedKeys, confirm, clearFilters }) {
  const [from = '', to = ''] = selectedKeys
  const invalid = Boolean(from && to && from > to)
  return <div className="table-filter-dropdown" style={{ padding: 8, width: 260 }} onKeyDown={(event) => event.stopPropagation()}>
    <label>From<Input type="date" aria-label="Quotation date from" value={from} max={to || undefined} onChange={(event) => setSelectedKeys([event.target.value, to])} /></label>
    <label>To<Input type="date" aria-label="Quotation date to" value={to} min={from || undefined} onChange={(event) => setSelectedKeys([from, event.target.value])} /></label>
    {invalid && <Typography.Text tone="danger">End date must be on or after start date.</Typography.Text>}
    <Space><Button size="small" variant="primary" disabled={invalid} onClick={() => confirm()}>Apply</Button><Button size="small" onClick={() => { clearFilters?.(); setSelectedKeys([]); confirm() }}>Reset</Button></Space>
  </div>
}
