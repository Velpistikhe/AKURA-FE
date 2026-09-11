import { useRef, useState } from 'react'
import { App, Button, Card, Form, Space, Typography, useSaveConfirmation } from '../../components/global'
import { quotationService } from '../../services/quotationService'
import QuotationForm from './QuotationForm'
import { quotationPayload } from './quotationModel'
import '../company/CompanyPage.css'
import './QuotationPage.css'

export default function QuotationCreatePage({ onBack }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const save = async (values) => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      if (!await confirmSave('quotation')) return
      await quotationService.create(quotationPayload(values))
      message.success('Quotation created successfully.')
      onBack()
    } catch (error) { message.error(error.message) }
    finally { savingRef.current = false; setSaving(false) }
  }
  return <section className="company-page quotation-page">
    {saveConfirmation}
    <div className="company-page-heading">
      <div><Typography.Title level={2}>Create Quotation</Typography.Title><Typography.Text tone="secondary">Enter quotation details and select items from the catalog.</Typography.Text></div>
      <Space><Button disabled={saving} onClick={onBack}>Cancel</Button><Button variant="primary" busy={saving} onClick={() => form.submit()}>Save Quotation</Button></Space>
    </div>
    <Card><QuotationForm form={form} saving={saving} onFinish={save} /></Card>
  </section>
}
