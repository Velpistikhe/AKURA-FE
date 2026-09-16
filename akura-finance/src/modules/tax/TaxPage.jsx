import { useEffect, useRef, useState } from 'react'
import { Alert, App, Card, Form, Input, Popconfirm, Space, Table, Tabs, Tag, Typography } from 'antd'
import { PlusOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Modal } from '../../components/FinanceControls'
import { taxService } from '../../services/taxService'
import { canManageTaxes, taxPayload } from './taxModel'

const date = (value) => value ? value.slice(0, 10) : '—'
const timestamp = (value) => value ? new Date(value).toLocaleString() : '—'
const columns = {
  periods: [
    { title: 'Tax', dataIndex: 'percentage', render: (value) => `${value}%` },
    { title: 'Effective From', dataIndex: 'effectiveFrom', render: date },
    { title: 'Effective Until (inclusive)', dataIndex: 'effectiveUntil', render: (value) => value ? date(value) : 'Open ended' },
    { title: 'Created By', dataIndex: 'createdByName' },
    { title: 'Created At', dataIndex: 'createdAt', render: timestamp },
  ],
  deliveries: [
    { title: 'Target Service', dataIndex: 'targetService' },
    { title: 'Status', dataIndex: 'deliveredAt', render: (value) => <Tag color={value ? 'green' : 'orange'}>{value ? 'Delivered' : 'Pending'}</Tag> },
    { title: 'Attempts', dataIndex: 'attempts' },
    { title: 'Next Retry', dataIndex: 'nextRetryAt', render: timestamp },
    { title: 'Delivered At', dataIndex: 'deliveredAt', render: timestamp },
    { title: 'Last Error', dataIndex: 'lastError', render: (value) => value || '—' },
  ],
}

export default function TaxPage({ currentUser }) {
  const canWrite = canManageTaxes(currentUser)
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [view, setView] = useState({ tab: 'periods', page: 1 })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [editor, setEditor] = useState(false)
  const [latestFrom, setLatestFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  const lock = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setRows([])
    const read = view.tab === 'periods' ? taxService.list : taxService.deliveries
    read({ page: view.page, limit: 20 }, { signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setRows(response.data) })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [view, reload])

  const run = async (action) => {
    if (!canWrite || lock.current) return
    lock.current = true; setBusy(true); setSaveError('')
    try { await action() }
    catch (err) {
      if (mounted.current) {
        setSaveError(err.message)
        message.error(err.message)
        if (err.status === 409) setReload((value) => value + 1)
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  const openEditor = () => run(async () => {
    const response = await taxService.list({ page: 1, limit: 1 })
    if (!mounted.current) return
    setLatestFrom(response.data[0]?.effectiveFrom || '')
    form.resetFields(); setEditor(true)
  })
  const save = (values) => run(async () => {
    // Recheck the latest period, including future periods, before submitting.
    const response = await taxService.list({ page: 1, limit: 1 })
    if (!mounted.current) return
    const latest = response.data[0]?.effectiveFrom || ''
    setLatestFrom(latest)
    await taxService.create(taxPayload(values, latest))
    if (!mounted.current) return
    setEditor(false); setView({ tab: 'periods', page: 1 }); setReload((value) => value + 1)
    message.success('Tax period saved. Synchronization queued.')
  })
  const resync = () => run(async () => {
    await taxService.resync()
    if (!mounted.current) return
    setView({ tab: 'deliveries', page: 1 }); setReload((value) => value + 1)
    message.success('Tax synchronization queued.')
  })

  return <section className="finance-page">
    <div className="finance-heading">
      <div><Typography.Title level={2}>Tax</Typography.Title><Typography.Text type="secondary">Manage tax periods for your office branch.</Typography.Text></div>
      <Space wrap>
        <Button icon={<ReloadOutlined />} disabled={busy || loading} onClick={() => setReload((value) => value + 1)}>Refresh</Button>
        {canWrite && <Popconfirm title="Resync branch taxes?" description="Send the latest tax periods to connected services." onConfirm={resync} disabled={busy}>
          <Button icon={<SyncOutlined />} disabled={busy}>Resync</Button>
        </Popconfirm>}
        {canWrite && <Button icon={<PlusOutlined />} type="primary" disabled={busy} loading={busy && !editor} onClick={openEditor}>Add Tax</Button>}
      </Space>
    </div>
    <Typography.Paragraph type="secondary">Adding a period closes the previous period one day before the new start date. Only Finance administrators can add tax periods or resync.</Typography.Paragraph>
    <Tabs activeKey={view.tab} onChange={(tab) => setView({ tab, page: 1 })} items={[{ key: 'periods', label: 'Tax Periods' }, { key: 'deliveries', label: 'Synchronization' }]} />
    {error && <Alert className="finance-error" type="error" showIcon title="Unable to load taxes" description={error} />}
    {saveError && !editor && <Alert className="finance-error" type="error" showIcon title={saveError} />}
    {view.tab === 'deliveries' && <Typography.Paragraph type="secondary">Pending deliveries retry automatically. Refresh to see the latest status.</Typography.Paragraph>}
    <Card>
      <Table rowKey="id" dataSource={rows} columns={columns[view.tab]} loading={loading} pagination={false} scroll={{ x: view.tab === 'periods' ? 800 : 1100 }} />
      <Space wrap className="finance-pagination">
        <Button disabled={loading || view.page === 1} onClick={() => setView((value) => ({ ...value, page: value.page - 1 }))}>Previous</Button>
        <Typography.Text>Page {view.page}</Typography.Text>
        <Button disabled={loading || Boolean(error) || rows.length < 20} onClick={() => setView((value) => ({ ...value, page: value.page + 1 }))}>Next</Button>
      </Space>
    </Card>
    <Modal title="Add Tax Period" open={editor} onCancel={() => { if (!busy) setEditor(false) }} onOk={() => form.submit()} confirmLoading={busy} cancelButtonProps={{ disabled: busy }} closable={!busy} mask={{ closable: !busy }} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} disabled={busy}>
        <Form.Item name="percentage" label="Tax Percentage (%)" rules={[{ required: true }, { validator: (_, value) => {
          if (/^\d{1,3}(\.\d{1,2})?$/.test(String(value ?? '')) && Number(value) <= 100) return Promise.resolve()
          return Promise.reject(new Error('Enter 0–100 with up to two decimal places.'))
        } }]}><Input inputMode="decimal" placeholder="11.25" /></Form.Item>
        <Form.Item name="effectiveFrom" label="Effective From" extra={latestFrom ? `Must be after ${date(latestFrom)}, including any scheduled periods.` : 'The first date this tax percentage applies.'} rules={[{ required: true }, { validator: (_, value) => !value || !latestFrom || value > date(latestFrom) ? Promise.resolve() : Promise.reject(new Error(`Choose a date after ${date(latestFrom)}.`)) }]}><Input type="date" /></Form.Item>
        {saveError && <Alert type="error" showIcon title={saveError} />}
      </Form>
    </Modal>
  </section>
}
