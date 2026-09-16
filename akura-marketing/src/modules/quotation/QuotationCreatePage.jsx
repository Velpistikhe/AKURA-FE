import { useRef, useState } from 'react'
import { Result } from 'antd'
import { App, Button, Card, Form, Space, Typography, useSaveConfirmation } from '../../components/global'
import { quotationService } from '../../services/quotationService'
import QuotationForm from './QuotationForm'
import { quotationPayload } from './quotationModel'
import { canManageQuotations } from './quotationAccess'
import '../company/CompanyPage.css'
import './QuotationPage.css'

export default function QuotationCreatePage({ currentUser, onBack }) {
  if (!canManageQuotations(currentUser)) return <Result status="403" title="Access denied" subTitle="Only the Marketing section can create quotations." />
  return <QuotationCreateForm onBack={onBack} />
}

function QuotationCreateForm({ onBack }) {
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
      await quotationService.create(quotationPayload(values, { create: true }))
      message.success('Quotation created successfully.')
      onBack()
    } catch (error) { message.error(error.message) }
    finally { savingRef.current = false; setSaving(false) }
  }
  return <section className="company-page quotation-page">
    {saveConfirmation}
    <div className="company-page-heading">
      <div><Typography.Title level={2}>Create Quotation</Typography.Title><Typography.Text tone="secondary">Enter quotation details and select items from the catalog.</Typography.Text></div>
      <Space><Button disabled={saving} onClick={onBack}>Cancel</Button><Button variant="primary" disabled={loading} busy={saving} onClick={() => form.submit()}>Save Quotation</Button></Space>
    </div>
    <Card><QuotationForm form={form} saving={saving} onFinish={save} onLoadingChange={setLoading} /></Card>
  </section>
}
