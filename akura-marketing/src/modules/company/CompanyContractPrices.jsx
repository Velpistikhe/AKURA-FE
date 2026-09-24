import { useEffect, useRef, useState } from 'react'
import { App, Button, UploadOutlined, Space, EditOutlined, DeleteOutlined, Popconfirm, Modal, Table, TableSearchFilter, Tag, Typography } from '../../components/global'
import { formatPriceInput } from '../../components/global/priceFormat'
import { contractService } from '../../services/contractService'
import { canViewInactiveCatalog } from '../catalogAccess'
import { canCreateContractPrice, canEditContractPrice, canDeleteContractPrice } from './contractAccess'
import { canReceiveContractPrices } from './contractPriceModel'
import CompanyContractUpload from './CompanyContractUpload'
import CompanyContractPriceEditor from './CompanyContractPriceEditor'
import CompanyContractPriceHistory from './CompanyContractPriceHistory'
import { HistoryOutlined } from '../../components/global'

export default function CompanyContractPrices({ company, currentUser, initialContract, onClose, onChanged }) {
  const { message } = App.useApp()
  const [deletingId, setDeletingId] = useState(null)
  const deleteLock = useRef(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const contractId = initialContract?.id
  const [contracts, setContracts] = useState(initialContract ? [initialContract] : [])
  const [contractsLoading, setContractsLoading] = useState(true)
  const [contractsError, setContractsError] = useState('')
  const [query, setQuery] = useState({ page: 1, limit: 20, search: '', isActive: '', sortBy: '', sortOrder: '' })
  const [data, setData] = useState({ prices: [], pagination: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null)
  const [historyPrice, setHistoryPrice] = useState(null)
  const inactive = canViewInactiveCatalog(currentUser)
  const selectedContract = contracts.find((row) => row.id === contractId)
  const marketingAccess = company.revoked !== true && currentUser?.section === 'MARKETING'
  const canCreate = marketingAccess && canCreateContractPrice(currentUser, selectedContract)
  const canEdit = marketingAccess && canEditContractPrice(currentUser, selectedContract)
  const canDelete = marketingAccess && canDeleteContractPrice(currentUser, selectedContract)

  useEffect(() => {
    let active = true
    setContractsLoading(true); setContractsError('')
    if (!contractId) { setContracts([]); setContractsLoading(false); return }
    contractService.get(contractId)
      .then(({ data: contract }) => { if (active) setContracts([contract]) })
      .catch((err) => { if (active) { setContractsError(err.message); setContracts([]) } })
      .finally(() => { if (active) setContractsLoading(false) })
    return () => { active = false }
  }, [contractId, revision])

  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setData({ prices: [], pagination: {} })
    if (!contractId) { setLoading(false); return }
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

  const deletePrice = async (row) => {
    if (deleteLock.current || contractsLoading || !canDelete || row.isActive !== true || row.contractId !== contractId) return
    deleteLock.current = true
    setDeletingId(row.id)
    try {
      await contractService.removePrice(row.id, row.version)
      message.success('Contract price deleted.')
      refresh()
    } catch (err) {
      message.error(err.message)
      if (err.status === 409 || err.status === 404) refresh()
    } finally {
      deleteLock.current = false
      setDeletingId(null)
    }
  }

  return <Modal title={`Contract Items and Prices: ${company.name}`} visible={!closing} footer={null} width={1150}
    onCancel={() => { if (!uploadOpen && !historyPrice && !deleteLock.current) setClosing(true) }} afterClose={onClose}
    closable={!deletingId} keyboard={!deletingId} mask={{ closable: !deletingId }} unmountOnClose>
    <div className="company-view-section-heading"><Space size={8}>
      {marketingAccess && <Button icon={<UploadOutlined />} disabled={Boolean(deletingId) || contractsLoading || !selectedContract} onClick={() => setUploadOpen(true)}>Upload Price List</Button>}
      {marketingAccess && <Button variant="primary" disabled={Boolean(deletingId) || contractsLoading || !canCreate} onClick={() => setEditor({ price: null, contract: selectedContract })}>Add Contract Price</Button>}
    </Space></div>
    {marketingAccess && !contractsLoading && !selectedContract && <p>Contract details are unavailable. Reload to manage prices.</p>}
    {selectedContract && <p>Contract: <strong>{selectedContract.contractNumber}</strong></p>}
    {marketingAccess && selectedContract && !canCreate && <p>{canReceiveContractPrices(selectedContract)
      ? 'Adding or editing prices for SUBMITTED and APPROVED contracts requires ADMIN in Marketing.'
      : 'Prices can only be added or edited for DRAFT, REJECTED, SUBMITTED, or APPROVED contracts that have not been deleted.'}</p>}
    {(error || contractsError) && <div role="alert"><Typography.Text tone="danger">{error || contractsError}</Typography.Text> <Button onClick={() => setRevision((value) => value + 1)}>Retry</Button></div>}
    <Table rowKey="id" loading={loading} dataSource={data.prices} scroll={{ x: 1000 }}
      pagination={{ disabled: Boolean(deletingId), current: query.page, pageSize: query.limit, total: data.pagination?.total || 0, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100],
        onChange: (page, limit) => setQuery((value) => ({ ...value, page: value.limit === limit ? page : 1, limit })) }}
      onChange={(_, filters, sorter, extra) => {
        if (deleteLock.current || extra.action === 'paginate') return
        setQuery((value) => ({ ...value, page: 1, search: (filters.search?.[0] || '').trim(), isActive: filters.isActive?.[0] || '',
          sortBy: sorter.order ? sorter.field : '', sortOrder: sorter.order === 'ascend' ? 'asc' : sorter.order ? 'desc' : '' }))
      }} columns={[
        { title: 'Contract', key: 'contractId',
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
        { title: 'Actions', width: canEdit || canDelete ? 148 : 80, fixed: 'right', render: (_, row) => <Space size={4}>
          <Button variant="text" icon={<HistoryOutlined />} title="View Contract Price History" aria-label={`View contract price history ${row.catalogSnapshot?.itemName || 'Item'} (${row.catalogSnapshot?.size || 'No size'})`}
            disabled={Boolean(deletingId)} onClick={() => setHistoryPrice(row)} />
          {row.isActive === true && canEdit && <Button variant="text" icon={<EditOutlined />} title="Edit Contract Price" disabled={contractsLoading || Boolean(deletingId)}
            onClick={() => setEditor({ price: row, contract: selectedContract })} />}
          {row.isActive === true && canDelete && <Popconfirm title="Delete contract price?" description={`Remove ${row.catalogSnapshot?.itemName || 'this item'} (${row.catalogSnapshot?.size || 'No size'}) from this contract's active price list?`}
            okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }} disabled={contractsLoading || Boolean(deletingId)} onConfirm={() => deletePrice(row)}>
            <Button variant="text" isDanger icon={<DeleteOutlined />} title="Delete Contract Price" busy={deletingId === row.id} disabled={contractsLoading || Boolean(deletingId)} />
          </Popconfirm>}
        </Space> },
      ]} />
    {uploadOpen && <CompanyContractUpload company={company} contractId={selectedContract?.id} onClose={() => setUploadOpen(false)} onChanged={refresh} />}
    {editor && <CompanyContractPriceEditor {...editor} company={company} currentUser={currentUser} onClose={() => setEditor(null)} onSaved={refresh} onConflict={refresh} />}
    {historyPrice && <CompanyContractPriceHistory key={historyPrice.id} price={historyPrice} onClose={() => setHistoryPrice(null)} />}
  </Modal>
}
