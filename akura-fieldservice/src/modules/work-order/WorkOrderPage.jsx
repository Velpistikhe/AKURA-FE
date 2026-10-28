import TableSearchFilter from '../../components/global/TableSearchFilter'
import { useEffect, useRef, useState } from 'react'
import { App, Button, Card, CheckOutlined, DeleteOutlined, EditOutlined, EyeOutlined, Modal, Popconfirm, Result, Table, Tag, Typography } from '../../components/global'
import { workOrderService } from '../../services/workOrderService'
import { canAccessWorkOrders, canCreateWorkOrders, canEditWorkOrders, canRevokeWorkOrder, canStartWorkOrder, WORK_ORDER_STATUSES, activeQuotationItems, quotationNumber } from './workOrderModel'
import WorkOrderCreate from './WorkOrderCreate'
import WorkOrderEdit from './WorkOrderEdit'
import WorkOrderHistory from './WorkOrderHistory'
import './CompanyPage.css'
import './WorkOrderPage.css'

const displayEnum = (value) => value ? value.replaceAll('_', ' ') : '-'
const date = (value) => value ? String(value).slice(0, 10) : '-'
const companyName = (record) => record.quotationSnapshot?.companySnapshot?.name || record.contractSnapshot?.company?.name || '-'
const quotationItemColumns = [
  { title: 'Service', dataIndex: 'serviceName', render: (value) => value || 'Standalone' },
  { title: 'Item', dataIndex: 'itemName', render: (value) => value || '-' },
  { title: 'Size', dataIndex: 'size', render: (value) => value ?? 'Without size' },
  { title: 'Inspection Quantity', dataIndex: 'quantityInspection', render: (value) => value ?? '-' },
  { title: 'Maintenance Quantity', dataIndex: 'quantityMaintenance', render: (value) => value ?? '-' },
]

export default function WorkOrderPage({ currentUser }) {
  if (!canAccessWorkOrders(currentUser)) return <Result status="403" title="Access denied" subTitle="Work orders require an active ADMIN, APP_MANAGER, Marketing, or Field Service user with an assigned branch." />
  return <WorkOrderList currentUser={currentUser} />
}

function WorkOrderList({ currentUser }) {
  const { message } = App.useApp()
  const [revokingId, setRevokingId] = useState(null)
  const revokeLock = useRef(false)
  // Start unfiltered so the list includes every status and both active/revoked orders.
  const [query, setQuery] = useState({ page: 1, limit: 20, search: '' })
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
  const revoke = async (row) => {
    if (revokeLock.current || !canRevokeWorkOrder(currentUser, row)) return
    revokeLock.current = true
    setRevokingId(row.id)
    try {
      await workOrderService.revoke(row.id, row.version)
      message.success(`Work order ${row.number} revoked.`)
      setRetry((value) => value + 1)
    } catch (err) {
      message.error(err?.message || 'Unable to revoke the work order.')
      if ([404, 409].includes(err?.status)) setRetry((value) => value + 1)
    } finally {
      revokeLock.current = false
      setRevokingId(null)
    }
  }
  return <section className="company-page work-order-page">
    <div className="company-page-heading"><div><Typography.Title level={2}>Work Orders</Typography.Title><Typography.Text tone="secondary">View work orders for your branch.</Typography.Text></div>
      {canCreateWorkOrders(currentUser) && <WorkOrderCreate currentUser={currentUser} onCreated={() => setRetry((value) => value + 1)} />}
    </div>
    <Card>
      {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
      <Table rowKey="id" busy={loading} dataSource={data.workOrders} tableLayout="auto" scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Number', dataIndex: 'number', key: 'search', filteredValue: query.search ? [query.search] : null,
            filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search number or summary" /> },
          { title: 'Company', render: (_, row) => companyName(row) },
          { title: 'Quotation Number', dataIndex: 'quotationNo', render: (value) => value ?? '-' },
          { title: 'Quotation Date', dataIndex: 'quotationDate', render: date },
          { title: 'Contract Number', dataIndex: 'contractNumber', render: (value) => value || '-' },
          { title: 'Date', dataIndex: 'date', render: date },
          { title: 'Start Date', dataIndex: 'startDate', render: date },
          { title: 'End Date', dataIndex: 'endDate', render: date },
          { title: 'Status', dataIndex: 'status', filteredValue: query.status ? [query.status] : null, filterMultiple: false,
            filters: WORK_ORDER_STATUSES.map((value) => ({ text: displayEnum(value), value })), render: (value) => <Tag>{displayEnum(value)}</Tag> },
          { title: 'Activity', dataIndex: 'revoked', filteredValue: query.revoked == null ? null : [String(query.revoked)], filterMultiple: false,
            filters: [{ text: 'Active', value: 'false' }, { text: 'Revoked', value: 'true' }], render: (value) => <Tag>{value ? 'Revoked' : 'Active'}</Tag> },
          { title: 'Actions', key: 'actions', fixed: 'right', render: (_, row) => <div className="work-order-detail-actions">
            <Button variant="text" icon={<EyeOutlined />} title="View Work Order" disabled={Boolean(revokingId)} onClick={() => setSelectedId(row.id)} />
            {canRevokeWorkOrder(currentUser, row) && <Popconfirm title="Delete work order?" description={`Work order ${row.number} will be revoked. Its history will be retained.`}
              okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }} disabled={loading || Boolean(revokingId)} onConfirm={() => revoke(row)}>
              <Button variant="text" isDanger icon={<DeleteOutlined />} title="Delete Work Order" aria-label="Delete Work Order" busy={revokingId === row.id} disabled={loading || Boolean(revokingId)} />
            </Popconfirm>}
          </div> },
        ]}
        onChange={(_, filters, _sorter, extra) => {
          if (extra.action === 'filter') setQuery((current) => ({ ...current, page: 1,
            search: (filters.search?.[0] || '').trim(), status: filters.status?.[0],
            revoked: filters.revoked?.length ? filters.revoked[0] === 'true' : undefined }))
        }}
        pagination={{ current: query.page, pageSize: query.limit, total: data.pagination.total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], onChange: (page, limit) => setQuery({ ...query, page: limit === query.limit ? page : 1, limit }) }} />
    </Card>
    {selectedId && <WorkOrderDetail key={selectedId} id={selectedId} currentUser={currentUser} onChanged={() => setRetry((value) => value + 1)} onClose={() => setSelectedId(null)} />}
  </section>
}

function WorkOrderDetail({ id, currentUser, onChanged, onClose }) {
  const { message } = App.useApp()
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const [retry, setRetry] = useState(0)
  const [editing, setEditing] = useState(false)
  const [starting, setStarting] = useState(false)
  // A second start request would otherwise race the first and consume the same
  // optimistic-lock version twice, returning a spurious 409.
  const startLock = useRef(false)
  useEffect(() => {
    let active = true
    setError('')
    setRecord(null)
    workOrderService.get(id).then(({ data }) => { if (active) setRecord(data) })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [id, retry])

  const reload = () => setRetry((value) => value + 1)

  const start = async () => {
    if (startLock.current || !record) return
    if (!canStartWorkOrder(currentUser, record)) return
    startLock.current = true
    setStarting(true)
    try {
      const { data } = await workOrderService.start(record.id, record.version)
      setRecord(data)
      message.success(`Work order ${data.number} started.`)
      onChanged()
    } catch (err) {
      message.error(err?.message || 'Unable to start the work order.')
      // 409 covers stale version, non-draft state and snapshot mismatches, so the
      // detail is reloaded to surface the current server truth.
      if ([404, 409].includes(err?.status)) reload()
    } finally {
      startLock.current = false
      setStarting(false)
    }
  }

  const canStart = canStartWorkOrder(currentUser, record)
  const canEdit = Boolean(record?.status === 'DRAFT' && !record.revoked && canEditWorkOrders(currentUser))
  const locked = editing || closing || starting
  return <Modal title={record?.number || 'Work Order Detail'} visible={!closing} width={900} onCancel={locked ? undefined : () => setClosing(true)} closable={!locked} maskClosable={!locked} keyboard={!locked}
    footer={<Button disabled={locked} onClick={() => setClosing(true)}>Close</Button>} afterClose={onClose} unmountOnClose>
    {error ? <div role="alert">{error} <Button onClick={reload}>Retry</Button></div> : !record ? <Typography.Text>Loading work order…</Typography.Text> : <div className="work-order-detail">
      <Card title="Work Order Information" extra={<div className="work-order-detail-actions">
        {canEdit && <Button variant="primary" icon={<EditOutlined />} disabled={locked} onClick={() => setEditing(true)}>Edit Work Order</Button>}
        {canStart && <Popconfirm title="Start work order?" description="The work order moves from DRAFT to IN_PROGRESS and its inspectors and quotation are re-validated." onConfirm={start} okText="Start" cancelText="Cancel" disabled={locked}>
          <Button variant="primary" icon={<CheckOutlined />} busy={starting} disabled={locked}>Approve</Button>
        </Popconfirm>}
      </div>}><dl className="company-detail-grid">
        <div><dt>Number</dt><dd>{record.number}</dd></div><div><dt>Date</dt><dd>{date(record.date)}</dd></div>
        <div><dt>Company</dt><dd>{companyName(record)}</dd></div><div><dt>Status</dt><dd><Tag>{displayEnum(record.status)}</Tag>{record.revoked && <Tag color="error">Revoked</Tag>}</dd></div>
        <div><dt>Start Date</dt><dd>{date(record.startDate)}</dd></div><div><dt>End Date</dt><dd>{date(record.endDate)}</dd></div>
        <div><dt>Document Basis</dt><dd>{record.quotationId ? `Quotation ${record.quotationSnapshot ? quotationNumber(record.quotationSnapshot) : record.quotationId}` : `Contract ${record.contractSnapshot?.number || record.contractId || '-'}`}</dd></div>
        <div><dt>Created By</dt><dd>{record.createdByName || '-'}</dd></div>
        <div><dt>Inspectors</dt><dd>{record.inspectors?.length ? record.inspectors.map((inspector) => inspector.name).join(', ') : 'No inspectors assigned.'}</dd></div>
      </dl></Card>
      {record.quotationSnapshot && <Card title="Quotation Snapshot">
        <dl className="company-detail-grid">
          <div><dt>Quotation</dt><dd>{quotationNumber(record.quotationSnapshot)}</dd></div>
          <div><dt>Subject</dt><dd>{record.quotationSnapshot.subject || '-'}</dd></div>
          <div><dt>Company</dt><dd>{record.quotationSnapshot.companySnapshot?.name || '-'}</dd></div>
          <div><dt>Customer Contact</dt><dd>{record.quotationSnapshot.customerSnapshot || '-'}</dd></div>
          <div><dt>Date</dt><dd>{date(record.quotationSnapshot.date)}</dd></div>
          <div><dt>Status</dt><dd>{displayEnum(record.quotationSnapshot.status)}</dd></div>
        </dl>
        <div className="work-order-quotation-items">
          <Typography.Title level={5}>Quotation Items</Typography.Title>
          <Table rowKey={(item) => item.id || `${item.itemName}-${item.size}`} dataSource={activeQuotationItems(record.quotationSnapshot)}
            columns={quotationItemColumns} pagination={false} tableLayout="auto" scroll={{ x: 'max-content' }} locale={{ emptyText: 'No quotation items in this snapshot.' }} />
        </div>
      </Card>}
      <WorkOrderHistory id={id} version={record.version} />
      {editing && canEdit && <WorkOrderEdit record={record} onClose={() => setEditing(false)}
        onSaved={(updated) => { setRecord(updated); setEditing(false); onChanged() }}
        onReload={() => { setEditing(false); setRetry((value) => value + 1); onChanged() }} />}
    </div>}
  </Modal>
}

