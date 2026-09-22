import { useEffect, useState } from 'react'
import { Button, Modal, Table, Tag } from '../../components/global'
import { contractService } from '../../services/contractService'

const labels = {
  contractNumber: 'Contract Number', contractDate: 'Contract Date', effectiveFrom: 'Effective From',
  effectiveUntil: 'Effective Until', status: 'Status', terminatedAt: 'Termination Date',
  revisionOfId: 'Revision Of', isDeleted: 'Deleted', hasList: 'Price List Available', companySnapshot: 'Company',
}
const metadata = new Set(['id', 'companyId', 'version', 'createdAt', 'updatedAt', 'createdById', 'updatedById'])
const dateFields = new Set(['contractDate', 'effectiveFrom', 'effectiveUntil', 'terminatedAt'])
function formatValue(value, row) {
  if (value == null || value === '') return '-'
  if (dateFields.has(row.field)) return String(value).slice(0, 10)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return value.name || JSON.stringify(value)
  return String(value)
}
function changesFor(row) {
  const snapshot = row.snapshot || {}
  const before = snapshot.oldData || {}
  const after = snapshot.newData || snapshot
  const fields = snapshot.changedFields || Object.keys(after)
  return fields.filter((field) => !metadata.has(field)).map((field) => ({
    field, label: labels[field] || field.replace(/([A-Z])/g, ' $1'), before: before[field], after: after[field],
  }))
}

export default function CompanyContractHistory({ contract, onClose }) {
  const [closing, setClosing] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [retry, setRetry] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState({ history: [], pagination: { total: 0 } })
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    contractService.history(contract.id, { page, limit }).then(({ data: result }) => {
      if (active) setData(result)
    }).catch((err) => {
      if (active) { setError(err.message); setData({ history: [], pagination: { total: 0 } }) }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [contract.id, page, limit, retry])
  const close = () => setClosing(true)
  return <Modal title={`Contract History: ${contract.contractNumber}`} visible={!closing} width={1000}
    onCancel={close} afterClose={onClose} footer={<Button onClick={close}>Close</Button>} unmountOnClose>
    <section className="company-contract-history">
      {error && <div role="alert">{error} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}
      <Table rowKey="id" busy={loading} dataSource={data.history} scroll={{ x: 650 }}
        columns={[
          { title: 'Version', dataIndex: 'version', width: 90 },
          { title: 'Action', dataIndex: 'action', render: (value) => <Tag>{value}</Tag> },
          { title: 'Changed At', dataIndex: 'createdAt', render: (value) => value ? new Date(value).toLocaleString() : '-' },
          { title: 'Changed By', dataIndex: 'createdByName', render: (value) => value || '-' },
        ]}
        expandable={{ expandedRowRender: (row) => <Table rowKey="field" dataSource={changesFor(row)} pagination={false}
          scroll={{ x: 500 }} columns={[
            { title: 'Field', dataIndex: 'label' },
            { title: 'Before', dataIndex: 'before', render: formatValue },
            { title: 'After', dataIndex: 'after', render: formatValue },
          ]} locale={{ emptyText: 'No field changes recorded.' }} /> }}
        locale={{ emptyText: error ? 'Unable to load history.' : 'No history available.' }}
        pagination={{ current: page, pageSize: limit, total: data.pagination?.total || 0, showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100], onChange: (next, size) => { setPage(size !== limit ? 1 : next); setLimit(size) } }} />
    </section>
  </Modal>
}
