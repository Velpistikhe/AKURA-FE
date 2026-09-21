import { useEffect, useRef, useState } from 'react'
import { App, Button, Form, Modal, PriceInput, Table, TableSearchFilter, Typography, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import { itemService } from '../../services/itemService'
import { canCreateContractPrice, canEditContractPrice } from './contractAccess'
import { contractPricePayload } from './contractPriceModel'

export default function CompanyContractPriceEditor({ company, contract, price, currentUser, onClose, onSaved, onConflict }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [confirmSave, confirmation] = useSaveConfirmation()
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState({ page: 1, itemName: '', serviceName: '', size: '' })
  const [items, setItems] = useState({ sizes: [], pagination: {} })
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(!price)
  const [saving, setSaving] = useState(false)
  const [closeReason, setCloseReason] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  const allowed = company.revoked !== true && (price ? canEditContractPrice(currentUser, contract) && price.isActive === true
    : canCreateContractPrice(currentUser, contract))
  const selectionReady = Boolean(selected && selectedItem?.id === selected.itemId)
  const hasMaintenance = Boolean(price ? price.catalogSnapshot?.hasMaintenance : selectedItem?.service?.hasMaintenance)

  useEffect(() => {
    if (price || !selected) return
    let active = true
    setSelectedItem(null)
    itemService.get(selected.itemId)
      .then(({ data }) => { if (active) { setSelectedItem(data); setError('') } })
      .catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [price, selected, retry])

  useEffect(() => {
    if (price) return
    let active = true
    setLoading(true); setSelected(null); setSelectedItem(null)
    const timer = setTimeout(async () => {
      try {
        const response = await itemService.listContractPriceOptions(contract.id, { ...query, limit: 10 })
        if (active) {
          const lastPage = Math.max(1, response.data.pagination?.totalPages || 1)
          if (query.page > lastPage) setQuery((value) => ({ ...value, page: lastPage }))
          else setItems(response.data)
          setError('')
        }
      } catch (err) {
        if (active) { setError(err.message); setItems({ sizes: [], pagination: {} }) }
      } finally { if (active) setLoading(false) }
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [price, query, contract.id, retry])

  const save = async () => {
    if (!allowed || closeReason || lock.current || (!price && !selectionReady)) return
    lock.current = true
    try {
      const values = await form.validateFields()
      const payload = contractPricePayload(values, { ...(price ? { version: price.version } : { contractId: contract.id }), hasMaintenance })
      if (!await confirmSave(price ? 'contract price update' : 'new contract price')) return
      setSaving(true); setError('')
      if (price) await contractService.updatePrice(price.id, payload)
      else await contractService.createPrice(selected.id, payload)
      message.success(price ? 'Contract price updated.' : 'Contract price created.')
      setCloseReason('saved')
    } catch (err) {
      if (err.errorFields) return
      setError(err.message)
      if (err.status === 409) {
        message.warning('The contract or price has changed. Review the refreshed list before trying again.')
        setCloseReason('conflict')
      }
    } finally { lock.current = false; setSaving(false) }
  }

  const priceRules = (required) => [{ validator: async (_, value) => {
    if (value == null || value === '') {
      if (required) throw new Error('Price is required.')
    } else if (!/^\d{1,16}(\.\d{1,2})?$/.test(String(value))) throw new Error('Use up to 16 digits and two decimals.')
  } }]

  return <Modal title={price ? 'Edit Contract Price' : 'Add Contract Price'} visible={!closeReason} width={850} busy={saving}
    okText={price ? 'Save' : 'Create'} onOk={save} okButtonProps={{ disabled: !allowed || (!price && !selectionReady) }}
    onCancel={() => { if (!lock.current && !closeReason) setCloseReason('cancel') }}
    afterClose={() => { if (closeReason === 'saved') onSaved(); else if (closeReason === 'conflict') onConflict(); else onClose() }}
    closable={!saving} keyboard={!saving} mask={{ closable: !saving }} cancelButtonProps={{ disabled: saving }} unmountOnClose>
    {confirmation}
    <p className="contract-price-editor-heading">{company.name} · {contract?.contractNumber || price?.contract?.contractNumber}</p>
    {!price && <>
      <Table rowKey="id" loading={loading} dataSource={items.sizes} scroll={{ x: 500 }}
        locale={{ emptyText: 'No available items match these filters.' }}
        onChange={(_, filters, _sorter, extra) => {
          if (saving || extra.action !== 'filter') return
          setQuery({ page: 1, itemName: (filters.itemName?.[0] || '').trim(),
            serviceName: (filters.serviceName?.[0] || '').trim(), size: (filters.size?.[0] || '').trim() })
        }}
        rowSelection={{ type: 'radio', selectedRowKeys: selected ? [selected.id] : [],
          getCheckboxProps: () => ({ disabled: saving || loading }), onChange: (_, rows) => { setSelectedItem(null); setSelected(rows[0]); form.resetFields() } }}
        columns={[
          { title: 'Service', key: 'serviceName', filteredValue: query.serviceName ? [query.serviceName] : null,
            filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search service name" maxLength={200} />,
            render: (_, row) => row.serviceName || '-' },
          { title: 'Item', key: 'itemName', filteredValue: query.itemName ? [query.itemName] : null,
            filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search item name" maxLength={200} />,
            render: (_, row) => row.itemName || '-' },
          { title: 'Size', dataIndex: 'size', filteredValue: query.size ? [query.size] : null,
            filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search size" maxLength={100} />,
            render: (value) => value || 'No size' },
        ]} pagination={{ current: query.page, pageSize: 10, total: items.pagination?.total || 0, showSizeChanger: false,
          onChange: (page) => setQuery((value) => ({ ...value, page })) }} />
    </>}
    {(price || selected) && <Typography.Text>Selected item: {price?.catalogSnapshot?.itemName || selected?.itemName} · {price?.catalogSnapshot?.size || selected?.size || 'No size'}</Typography.Text>}
    <Form form={form} layout="vertical" disabled={saving || !allowed || (!price && !selectionReady)} preserve={false}
      initialValues={{ priceService: price?.priceService ?? null, priceMaintenance: price?.priceMaintenance ?? null }}>
      <Form.Item name="priceService" label="Service Price" rules={priceRules(true)}><PriceInput /></Form.Item>
      <Form.Item name="priceMaintenance" label={`Maintenance Price${hasMaintenance ? ' (required)' : ' (optional)'}`} rules={priceRules(hasMaintenance)}><PriceInput /></Form.Item>
    </Form>
    {error && <div role="alert"><Typography.Text tone="danger">{error}</Typography.Text> {!price && <Button disabled={saving} onClick={() => setRetry((value) => value + 1)}>Reload items</Button>}</div>}
  </Modal>
}
