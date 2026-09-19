import { useEffect, useRef, useState } from 'react'
import { App, Button, Form, Input, Modal, PriceInput, Table, Typography, useSaveConfirmation } from '../../components/global'
import { contractService } from '../../services/contractService'
import { itemService } from '../../services/itemService'
import { canCreateContractPrice, canEditContractPrice } from './contractAccess'
import { canReceiveContractPrices, contractPricePayload } from './contractPriceModel'

export default function CompanyContractPriceEditor({ company, contract, price, currentUser, onClose, onSaved, onConflict }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [confirmSave, confirmation] = useSaveConfirmation()
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState({ page: 1, itemName: '' })
  const [items, setItems] = useState({ sizes: [], pagination: {} })
  const [loading, setLoading] = useState(!price)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const lock = useRef(false)
  const allowed = company.revoked !== true && (price ? canEditContractPrice(currentUser) && price.isActive === true && canReceiveContractPrices(contract)
    : canCreateContractPrice(currentUser) && canReceiveContractPrices(contract))
  const hasMaintenance = Boolean(price ? price.catalogSnapshot?.hasMaintenance : selected?.item?.service?.hasMaintenance)

  useEffect(() => {
    if (price) return
    let active = true
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await itemService.listSizes({ ...query, limit: 10 })
        if (active) { setItems(response.data); setError('') }
      } catch (err) {
        if (active) { setError(err.message); setItems({ sizes: [], pagination: {} }) }
      } finally { if (active) setLoading(false) }
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [price, query, retry])

  const save = async () => {
    if (!allowed || lock.current || (!price && !selected)) return
    lock.current = true
    try {
      const values = await form.validateFields()
      const payload = contractPricePayload(values, { ...(price ? { version: price.version } : { contractId: contract.id }), hasMaintenance })
      if (!await confirmSave(price ? 'contract price update' : 'new contract price')) return
      setSaving(true); setError('')
      if (price) await contractService.updatePrice(price.id, payload)
      else await contractService.createPrice(selected.id, payload)
      message.success(price ? 'Contract price updated.' : 'Contract price created.')
      onSaved()
    } catch (err) {
      if (err.errorFields) return
      setError(err.message)
      if (err.status === 409) {
        message.warning('The contract or price has changed. Review the refreshed list before trying again.')
        onConflict()
      }
    } finally { lock.current = false; setSaving(false) }
  }

  const priceRules = (required) => [{ validator: async (_, value) => {
    if (value == null || value === '') {
      if (required) throw new Error('Price is required.')
    } else if (!/^\d{1,16}(\.\d{1,2})?$/.test(String(value))) throw new Error('Use up to 16 digits and two decimals.')
  } }]

  return <Modal title={price ? 'Edit Contract Price' : 'Add Contract Price'} visible width={850} busy={saving}
    okText={price ? 'Save' : 'Create'} onOk={save} okButtonProps={{ disabled: !allowed || (!price && !selected) }}
    onCancel={() => { if (!lock.current) onClose() }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }} cancelButtonProps={{ disabled: saving }} unmountOnClose>
    {confirmation}
    <p>{company.name} · {contract?.contractNumber || price?.contract?.contractNumber}</p>
    {!price && <>
      <Input placeholder="Search item name" aria-label="Search contract item" value={query.itemName} disabled={saving}
        onChange={(event) => setQuery({ page: 1, itemName: event.target.value })} maxLength={200} />
      <Table rowKey="id" loading={loading} dataSource={items.sizes} scroll={{ x: 500 }}
        rowSelection={{ type: 'radio', selectedRowKeys: selected ? [selected.id] : [],
          getCheckboxProps: () => ({ disabled: saving || loading }), onChange: (_, rows) => { setSelected(rows[0]); form.resetFields() } }}
        columns={[
          { title: 'Service', render: (_, row) => row.item?.service?.name || '-' },
          { title: 'Item', render: (_, row) => row.item?.name || '-' },
          { title: 'Size', dataIndex: 'size', render: (value) => value || 'No size' },
        ]} pagination={{ current: query.page, pageSize: 10, total: items.pagination?.total || 0, showSizeChanger: false,
          onChange: (page) => setQuery((value) => ({ ...value, page })) }} />
    </>}
    {(price || selected) && <Typography.Text>Selected item: {price?.catalogSnapshot?.itemName || selected?.item?.name} · {price?.catalogSnapshot?.size || selected?.size || 'No size'}</Typography.Text>}
    <Form form={form} layout="vertical" disabled={saving || !allowed} preserve={false}
      initialValues={{ priceService: price?.priceService ?? null, priceMaintenance: price?.priceMaintenance ?? null }}>
      <Form.Item name="priceService" label="Service Price" rules={priceRules(true)}><PriceInput /></Form.Item>
      <Form.Item name="priceMaintenance" label={`Maintenance Price${hasMaintenance ? ' (required)' : ' (optional)'}`} rules={priceRules(hasMaintenance)}><PriceInput /></Form.Item>
    </Form>
    {error && <div role="alert"><Typography.Text tone="danger">{error}</Typography.Text> {!price && <Button disabled={saving} onClick={() => setRetry((value) => value + 1)}>Reload items</Button>}</div>}
  </Modal>
}
