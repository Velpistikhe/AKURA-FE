import { useEffect, useState } from 'react'
import { Button, Card, EyeOutlined, Input, Modal, PlusOutlined, Result, Select, Table, Tag, Typography } from '../../components/global'
import { workOrderService } from '../../services/workOrderService'
import { displayEnum } from '../quotation/quotationModel'
import { canAccessWorkOrders, WORK_ORDER_STATUSES } from './workOrderModel'
import '../company/CompanyPage.css'
import './WorkOrderPage.css'

const date = (value) => value ? String(value).slice(0, 10) : '-'
const companyName = (record) => record.quotationSnapshot?.companySnapshot?.name || record.contractSnapshot?.company?.name || '-'

export default function WorkOrderPage({ currentUser, onCreate }) {
  if (!canAccessWorkOrders(currentUser)) return <Result status="403" title="Access denied" subTitle="Work orders require an active ADMIN, APP_MANAGER, or Field Service user with an assigned branch." />
  return <WorkOrderList onCreate={onCreate} />
}

function WorkOrderList({ onCreate }) {
  const [query, setQuery] = useState({ page: 1, limit: 20, search: '', status: 'DRAFT', revoked: false })
  const [data, setData] = useState({ workOrders: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      workOrderService.list(query).then(({ data: result }) => {
        if (!active) return
        if (!result.workOrders.length && query.page > 1) setQuery((current) => ({ ...current, page: Math.max(1, result.pagination.totalPages) }))
        else setData(result)
      }).catch((err) => { if (active) { setError(err.message); setData({ workOrders: [], pagination: { total: 0 } }) } })
        .finally(() => { if (active) setLoading(false) })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [query, retry])
  return <section className="company-page work-order-page">
    <div className="company-page-heading"><div><Typography.Title level={2}>Work Orders</Typography.Title><Typography.Text tone="secondary">Create and view work orders for your branch.</Typography.Text></div>
      <Button variant="primary" icon={<PlusOutlined />} onClick={onCreate}>Create Work Order</Button>
    </div>
    <Card>
      <div className="work-order-toolbar">
        <Input allowClear placeholder="Search work orders" aria-label="Search work orders" value={query.search} maxLength={100} onChange={(event) => setQuery({ ...query, page: 1, search: event.target.value })} />
        <Select aria-label="Work order status" value={query.status} options={WORK_ORDER_STATUSES.map((value) => ({ value, label: displayEnum(value) }))} onChange={(status) => setQuery({ ...query, page: 1, status })} />
        <Select aria-label="Revocation status" value={query.revoked ? 'revoked' : 'active'} options={[{ value: 'active', label: 'Active' }, { value: 'revoked', label: 'Revoked' }]} onChange={(value) => setQuery({ ...query, page: 1, revoked: value === 'revoked' })} />
      </div>
      {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
      <Table rowKey="id" busy={loading} dataSource={data.workOrders} scroll={{ x: 1000 }}
        columns={[
          { title: 'Number', dataIndex: 'number' },
          { title: 'Company', render: (_, row) => companyName(row) },
          { title: 'Date', dataIndex: 'date', render: date },
          { title: 'Start Date', dataIndex: 'startDate', render: date },
          { title: 'End Date', dataIndex: 'endDate', render: date },
          { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{displayEnum(value)}</Tag> },
          { title: 'Actions', key: 'actions', width: 90, render: (_, row) => <Button variant="text" icon={<EyeOutlined />} title="View Work Order" onClick={() => setSelectedId(row.id)} /> },
        ]}
        pagination={{ current: query.page, pageSize: query.limit, total: data.pagination.total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], onChange: (page, limit) => setQuery({ ...query, page: limit === query.limit ? page : 1, limit }) }} />
    </Card>
    {selectedId && <WorkOrderDetail id={selectedId} onClose={() => setSelectedId(null)} />}
  </section>
}

function WorkOrderDetail({ id, onClose }) {
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    setRecord(null)
    workOrderService.get(id).then(({ data }) => { if (active) setRecord(data) })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [id, retry])
  return <Modal title={record?.number || 'Work Order Detail'} visible width={900} onCancel={onClose} footer={<Button onClick={onClose}>Close</Button>} unmountOnClose>
    {error ? <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div> : !record ? <Typography.Text>Loading work order…</Typography.Text> : <div className="work-order-detail">
      <Card title="Work Order Information"><dl className="company-detail-grid">
        <div><dt>Number</dt><dd>{record.number}</dd></div><div><dt>Date</dt><dd>{date(record.date)}</dd></div>
        <div><dt>Company</dt><dd>{companyName(record)}</dd></div><div><dt>Status</dt><dd><Tag>{displayEnum(record.status)}</Tag>{record.revoked && <Tag color="error">Revoked</Tag>}</dd></div>
        <div><dt>Start Date</dt><dd>{date(record.startDate)}</dd></div><div><dt>End Date</dt><dd>{date(record.endDate)}</dd></div>
        <div><dt>Document Basis</dt><dd>{record.quotationId ? `Quotation ${record.quotationSnapshot?.no || record.quotationId}` : `Contract ${record.contractSnapshot?.number || record.contractId || '-'}`}</dd></div>
        <div><dt>Created By</dt><dd>{record.createdByName || '-'}</dd></div>
      </dl></Card>
      <Card title="Work Summary"><div className="work-order-summary">{record.summary}</div></Card>
      <Card title="Inspectors"><Table rowKey="id" dataSource={record.inspectors || []} pagination={false} columns={[{ title: 'Name', dataIndex: 'name' }]} locale={{ emptyText: 'No inspectors assigned.' }} /></Card>
    </div>}
  </Modal>
}
