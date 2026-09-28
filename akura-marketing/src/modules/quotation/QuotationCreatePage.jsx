import { useEffect, useRef, useState } from 'react'
import { Result } from 'antd'
import { App, Button, Card, Form, Space, Typography, useSaveConfirmation } from '../../components/global'
import { quotationService } from '../../services/quotationService'
import QuotationForm from './QuotationForm'
import { canCopyQuotation, quotationPayload } from './quotationModel'
import QuotationSkeleton from './QuotationSkeleton'
import { canManageQuotations } from './quotationAccess'
import '../company/CompanyPage.css'
import './QuotationPage.css'

export default function QuotationCreatePage({ currentUser, onBack, copyFrom }) {
  if (!canManageQuotations(currentUser)) return <Result status="403" title="Access denied" subTitle="Only the Marketing section can create quotations." />
  return <QuotationCreateSource key={copyFrom || 'new'} onBack={onBack} copyFrom={copyFrom} />
}

function QuotationCreateSource({ onBack, copyFrom }) {
  const [source, setSource] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!copyFrom) return
    let active = true
    setError('')
    quotationService.get(copyFrom).then(({ data }) => {
      if (!data?.id || !canCopyQuotation(data)) throw new Error('Only revised or approved quotations can be copied.')
      if (active) setSource(data)
    }).catch((error) => { if (active) setError(error.message) })
    return () => { active = false }
  }, [copyFrom, retry])
  if (copyFrom && !source) return <section className="company-page quotation-page">
    <Typography.Title level={2}>Create Quotation</Typography.Title>
    <Button onClick={onBack}>Cancel</Button>
    {error ? <div role="alert"><Typography.Text tone="danger">{error}</Typography.Text><Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></div> : <QuotationSkeleton />}
  </section>
  return <QuotationCreateForm onBack={onBack} copySource={source} />
}

function QuotationCreateForm({ onBack, copySource }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const savingRef = useRef(false)
  const save = async (values) => {
    if (savingRef.current || loading) return
    savingRef.current = true
    setSaving(true)
    try {
      if (!await confirmSave('quotation')) return
      const payload = quotationPayload(values, { create: true })
      if (copySource) payload.companyId = copySource.companyId || copySource.companySnapshot?.id
      await quotationService.create(payload)
      message.success('Quotation created successfully.')
      onBack()
    } catch (error) { message.error(error.message) }
    finally { savingRef.current = false; setSaving(false) }
  }
  return <section className="company-page quotation-page">
    {saveConfirmation}
    <div className="company-page-heading">
      <div><Typography.Title level={2}>Create Quotation</Typography.Title><Typography.Text tone="secondary">{copySource ? 'Create a new draft using copied quotation details. Company is fixed.' : 'Enter quotation details and select items from the catalog.'}</Typography.Text></div>
      <Space><Button disabled={saving} onClick={onBack}>Cancel</Button><Button variant="primary" disabled={loading} busy={saving} onClick={() => form.submit()}>Save Quotation</Button></Space>
    </div>
    <Card><QuotationForm form={form} copySource={copySource} saving={saving} onFinish={save} onLoadingChange={setLoading} /></Card>
  </section>
}
