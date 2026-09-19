import { useEffect, useState } from 'react'
import { Button, EditOutlined, Modal, Table, TableSearchFilter, Tag, Typography } from '../../components/global'
import { formatPriceInput } from '../../components/global/priceFormat'
import { contractService } from '../../services/contractService'
import { loadAll } from '../quotation/quotationModel'
import { canViewInactiveCatalog } from '../catalogAccess'
import { canCreateContractPrice, canEditContractPrice } from './contractAccess'
import { canReceiveContractPrices } from './contractPriceModel'
import CompanyContractPriceEditor from './CompanyContractPriceEditor'

export default function CompanyContractPrices({ company, currentUser, initialContract, onClose, onChanged }) {
  const [contractId, setContractId] = useState(initialContract?.id)
  const [contracts, setContracts] = useState(initialContract ? [initialContract] : [])
  const [contractsLoading, setContractsLoading] = useState(true)
  const [contractsError, setContractsError] = useState('')
  const [query, setQuery] = useState({ page: 1, limit: 20, search: '', isActive: '', sortBy: '', sortOrder: '' })
  const [data, setData] = useState({ prices: [], pagination: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null)
  const inactive = canViewInactiveCatalog(currentUser)
  const selectedContract = contracts.find((row) => row.id === contractId)
  const canCreate = company.revoked !== true && canCreateContractPrice(currentUser)
  const canEdit = company.revoked !== true && canEditContractPrice(currentUser)

  useEffect(() => {
    let active = true
    setContractsLoading(true); setContractsError('')
    loadAll(contractService.list, 'contracts', { companyId: company.id, isActive: inactive ? '' : 'true' })
      .then((rows) => { if (active) setContracts(rows) })
      .catch((err) => { if (active) { setContractsError(err.message); setContracts([]) } })
      .finally(() => { if (active) setContractsLoading(false) })
    return () => { active = false }
  }, [company.id, inactive, revision])

  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setData({ prices: [], pagination: {} })
    contractService.listPrices({ ...query, companyId: company.id, contractId, isActive: inactive ? query.isActive : 'true' })
      .then((response) => {
        if (!active) return
        if (!response.data.prices.length && query.page > 1) setQuery((value) => ({ ...value, page: Math.max(1, response.data.pagination?.totalPages || 1) }))
        else setData(response.data)
      })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [company.id, contractId, query, inactive, revision])

  const refresh = () => {
    setEditor(null)
    setRevision((value) => value + 1)
    onChanged?.()
  }
  const priceColumn = (title, field) => ({ title, dataIndex: field, sorter: true,
    sortOrder: query.sortBy === field ? (query.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
    render: (value) => value == null ? '-' : formatPriceInput(value) })

  return <Modal title={`Contract Items and Prices: ${company.name}`} visible footer={null} width={1150} onCancel={onClose} unmountOnClose>
    <div className="company-view-section-heading">
      {canCreate && <Button variant="primary" disabled={contractsLoading || !canReceiveContractPrices(selectedContract)} onClick={() => setEditor({ price: null, contract: selectedContract })}>Add Contract Price</Button>}
    </div>
    {canCreate && !selectedContract && <p>Choose a contract using the Contract column filter to add a single item price.</p>}
    {canCreate && selectedContract && !canReceiveContractPrices(selectedContract) && <p>Prices can only be added to an ACTIVE contract that has not ended.</p>}
    {(error || contractsError) && <div role="alert"><Typography.Text tone="danger">{error || contractsError}</Typography.Text> <Button onClick={() => setRevision((value) => value + 1)}>Retry</Button></div>}
    <Table rowKey="id" loading={loading} dataSource={data.prices} scroll={{ x: 1000 }}
      pagination={{ current: query.page, pageSize: query.limit, total: data.pagination?.total || 0, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100],
        onChange: (page, limit) => setQuery((value) => ({ ...value, page: value.limit === limit ? page : 1, limit })) }}
      onChange={(_, filters, sorter, extra) => {
        if (extra.action === 'paginate') return
        setContractId(filters.contractId?.[0])
        setQuery((value) => ({ ...value, page: 1, search: (filters.search?.[0] || '').trim(), isActive: filters.isActive?.[0] || '',
          sortBy: sorter.order ? sorter.field : '', sortOrder: sorter.order === 'ascend' ? 'asc' : sorter.order ? 'desc' : '' }))
      }} columns={[
        { title: 'Contract', key: 'contractId', filterMultiple: false, filterSearch: true, filteredValue: contractId ? [contractId] : null,
          filters: contracts.map((row) => ({ value: row.id, text: `${row.contractNumber} · ${row.status} · ${row.effectiveFrom.slice(0, 10)}` })),
          render: (_, row) => row.contract?.contractNumber || contracts.find((contract) => contract.id === row.contractId)?.contractNumber || '-' },
        { title: 'Service', render: (_, row) => row.catalogSnapshot?.serviceName || '-' },
        { title: 'Item', key: 'search', filteredValue: query.search ? [query.search] : null,
          filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search item or size" maxLength={200} />,
          render: (_, row) => row.catalogSnapshot?.itemName || '-' },
        { title: 'Size', render: (_, row) => row.catalogSnapshot?.size || 'No size' },
        priceColumn('Service Price', 'priceService'), priceColumn('Maintenance Price', 'priceMaintenance'),
        { title: 'Status', dataIndex: 'isActive', filterMultiple: false, filteredValue: inactive && query.isActive ? [query.isActive] : null,
          filters: inactive ? [{ text: 'Active', value: 'true' }, { text: 'Inactive', value: 'false' }] : undefined,
          render: (value) => <Tag>{value ? 'Active' : 'Inactive'}</Tag> },
        ...(canEdit ? [{ title: 'Actions', render: (_, row) => row.isActive === true && canReceiveContractPrices(row.contract || contracts.find((contract) => contract.id === row.contractId)) && <Button variant="text" icon={<EditOutlined />} title="Edit Contract Price"
          onClick={() => setEditor({ price: row, contract: row.contract || contracts.find((contract) => contract.id === row.contractId) })} /> }] : []),
      ]} />
    {editor && <CompanyContractPriceEditor {...editor} company={company} currentUser={currentUser} onClose={() => setEditor(null)} onSaved={refresh} onConflict={refresh} />}
  </Modal>
}
