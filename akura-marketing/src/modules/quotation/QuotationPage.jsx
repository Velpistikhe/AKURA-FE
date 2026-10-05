import { useCallback, useEffect, useRef, useState } from 'react'
import { App, Button, Card, DeleteOutlined, EditOutlined, EyeOutlined, FilePdfOutlined, Form, Modal, PlusOutlined, Popconfirm, Space, Table, Tag, Typography, useSaveConfirmation } from '../../components/global'
import { quotationService } from '../../services/quotationService'
import QuotationForm from './QuotationForm'
import QuotationSkeleton from './QuotationSkeleton'
import QuotationHistory from './QuotationHistory'
import CreateInvoiceAction from './CreateInvoiceAction'
import CreateWorkOrderAction from './CreateWorkOrderAction'
import { loadQuotationPdf, quotationPdfBlob } from './quotationPdfPreview'
import { canApproveQuotations, canManageQuotations } from './quotationAccess'
import { canViewInactiveCatalog } from '../catalogAccess'
import { CopyOutlined, SendOutlined, TableSearchFilter } from '../../components/global'
import { QuotationNumberFilter, QuotationDateFilter, QUOTATION_STATUSES, QUOTATION_INVOICE_STATUSES } from './QuotationTableFilters'
import { canCopyQuotation, canSubmitQuotation, canRejectQuotation, canReviseQuotation } from './quotationModel'
import { TEXT_FIELDS, canApproveQuotation, canUpdateQuotation, dateValue, displayEnum, money, quotationChanges, quotationNumber } from './quotationModel'
import '../company/CompanyPage.css'
import './QuotationPage.css'

export default function QuotationPage({ onCreate, onCopy, currentUser }) {
  const readOnly = !canManageQuotations(currentUser)
  const canApprove = canApproveQuotations(currentUser)
  const canViewInactive = canViewInactiveCatalog(currentUser)
  const [activeFilter, setActiveFilter] = useState('')
  const [listFilters, setListFilters] = useState({})
  const { message } = App.useApp()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [form] = Form.useForm()
  const [records, setRecords] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [transitionId, setTransitionId] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [pdfError, setPdfError] = useState('')
  const pdfController = useRef(null)
  const pdfObjectUrl = useRef(null)
  useEffect(() => () => {
    pdfController.current?.abort()
    if (pdfObjectUrl.current) URL.revokeObjectURL(pdfObjectUrl.current)
  }, [])
  const closePdf = () => {
    pdfController.current?.abort()
    if (pdfObjectUrl.current) URL.revokeObjectURL(pdfObjectUrl.current)
    pdfObjectUrl.current = null
    setPdfPreview(null); setPdfLoading(false); setPdfError('')
  }
  const approvingRef = useRef(false)
  const [detail, setDetail] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editingLoading, setEditingLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [openingId, setOpeningId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [stale, setStale] = useState(false)
  const requestRef = useRef(0)
  const detailRequestRef = useRef(0)
  const savingRef = useRef(false)

  const load = useCallback(async () => {
    const request = ++requestRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const response = await quotationService.list({ ...listFilters, page, limit: pageSize, isActive: canViewInactive ? activeFilter : 'true' })
      if (request !== requestRef.current) return
      setRecords(response.data?.quotations || [])
      setTotal(response.data?.pagination?.total || 0)
    } catch (error) {
      if (request === requestRef.current) { setLoadError(true); message.error(error.message) }
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }, [page, pageSize, message, canViewInactive, activeFilter, listFilters])
  useEffect(() => { load(); return () => { requestRef.current++ } }, [load])

  const view = async (record, edit = false) => {
    if (edit && readOnly) return
    const request = ++detailRequestRef.current
    setOpeningId(record.id)
    try {
      const response = await quotationService.get(record.id)
      if (request !== detailRequestRef.current) return
      if (!response.data?.id) throw new Error('Invalid quotation detail.')
      if (edit && !canUpdateQuotation(response.data, currentUser)) throw new Error('This quotation cannot be edited in its current state by your account.')
      if (edit) { setEditingLoading(true); setEditing(response.data); setStale(false); setDetailOpen(false); setOpen(true) }
      else { setDetail(response.data); setDetailOpen(true) }
    } catch (error) { message.error(error.message) }
    finally { if (request === detailRequestRef.current) setOpeningId(null) }
  }

  const save = async (values) => {
    if (readOnly || savingRef.current || stale || editingLoading || !canUpdateQuotation(editing, currentUser)) return
    const changes = quotationChanges(values, editing)
    if (!Object.keys(changes).length) { message.warning('No changes were made.'); return }
    savingRef.current = true
    setSaving(true)
    try {
      if (!await confirmSave('quotation')) return
      const response = await quotationService.update(editing.id, { ...changes, version: editing.version })
      message.success('Quotation updated successfully.')
      setEditing(response.data)
      setOpen(false)
      setDetail(response.data)
      setDetailOpen(true)
      await load()
    } catch (error) {
      message.error(error.message)
      if (error.status === 409) {
        if (editing) { setStale(true); message.warning('This quotation has changed. Reopen it to review the latest data before saving again.') }
        await load()
      }
    } finally { savingRef.current = false; setSaving(false) }
  }

  const changeItem = async (item, deleting = false) => {
    if (readOnly || savingRef.current || stale || editingLoading || !canUpdateQuotation(editing, currentUser)) return false
    savingRef.current = true
    setSaving(true)
    try {
      if (deleting && !Number.isInteger(item.version)) throw new Error('Item version is unavailable. Reopen the quotation before deleting this item.')
      const response = deleting
        ? await quotationService.removeItem(editing.id, item.id, editing.version, item.version)
        : await quotationService.addItem(editing.id, { version: editing.version, itemSizeId: item.itemSizeId,
          quantityInspection: item.quantityInspection, quantityMaintenance: item.quantityMaintenance, note: item.note || null })
      setEditing(response.data)
      setDetail(response.data)
      message.success(deleting ? 'Quotation item deleted.' : 'Quotation item added.')
      await load()
      return true
    } catch (error) {
      message.error(error.message)
      if (error.status === 409) {
        setStale(true)
        message.warning('Reopen the quotation to review its latest data before changing items again.')
        await load()
      }
      return false
    } finally { savingRef.current = false; setSaving(false) }
  }

  const remove = async (record) => {
    if (readOnly || !record.isActive) return
    setDeletingId(record.id)
    try {
      await quotationService.remove(record.id, record.version)
      message.success('Quotation deleted successfully.')
      if (detail?.id === record.id) setDetailOpen(false)
      await load()
    } catch (error) {
      message.error(error.message)
      if (error.status === 409) { message.warning('The quotation has changed. Review the latest data before trying again.'); await load() }
    } finally { setDeletingId(null) }
  }

  const transition = async (action, record = detail) => {
    const eligible = { submit: canSubmitQuotation, approve: canApproveQuotation, reject: canRejectQuotation, revise: canReviseQuotation }[action]
    if (readOnly || (action !== 'submit' && !canApprove) || approvingRef.current || !eligible?.(record)) return
    approvingRef.current = true
    setApproving(true)
    setTransitionId(record.id)
    try {
      const response = await quotationService[action](record.id, record.version)
      setDetail((current) => current?.id === record.id ? response.data : current)
      message.success({ submit: 'Quotation submitted for approval.', approve: 'Quotation approved and PDF generated.', reject: 'Quotation rejected.', revise: 'Draft revision created. Use Update Quotation to edit it.' }[action])
      await load()
    } catch (error) {
      message.error(error.message)
      if (error.status === 409 || error.status === 503) {
        if (detail?.id === record.id) setDetailOpen(false)
        message.warning('Reopen the quotation to review its latest state before retrying this action.')
        await load()
      }
    } finally { approvingRef.current = false; setApproving(false); setTransitionId(null) }
  }

  const openPdf = async (record, stored = false) => {
    if (!record?.id) return
    pdfController.current?.abort()
    if (pdfObjectUrl.current) URL.revokeObjectURL(pdfObjectUrl.current)
    pdfObjectUrl.current = null
    const controller = new AbortController()
    pdfController.current = controller
    setPdfPreview({ record, stored, title: `Quotation ${quotationNumber(record)}`, url: null })
    setPdfError('')
    setPdfLoading(true)
    try {
      let file
      if (stored) {
        const response = await quotationService.get(record.id)
        if (controller.signal.aborted) return
        file = await loadQuotationPdf(response.data?.pdf?.url, { signal: controller.signal })
        if (controller.signal.aborted) return
        setDetail((current) => current?.id === response.data.id ? response.data : current)
      } else {
        const response = await quotationService.previewPdf(record.id, { signal: controller.signal })
        if (controller.signal.aborted) return
        file = await quotationPdfBlob(response.blob)
      }
      if (controller.signal.aborted) return
      pdfObjectUrl.current = URL.createObjectURL(file)
      setPdfPreview({ record, stored, title: `Quotation ${quotationNumber(record)}`, url: pdfObjectUrl.current })
    } catch (error) { if (!controller.signal.aborted) setPdfError(error.message || 'Unable to preview PDF.') }
    finally { if (!controller.signal.aborted) setPdfLoading(false) }
  }

  const itemColumns = [
    { title: 'State', dataIndex: 'isActive', width: 110, render: (value) => <Tag>{value ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Service', dataIndex: 'serviceName', width: 240, render: (value) => value || 'Standalone' },
    { title: 'Type', dataIndex: 'serviceType', width: 100, render: (value) => value || '-' },
    { title: 'Item', dataIndex: 'itemName', width: 220, render: (value, item) => <div className="quotation-selected-item">
      <span>{value}</span>
      {item.note && <Typography.Text tone="secondary" style={{ whiteSpace: 'pre-wrap' }}>{item.note}</Typography.Text>}
    </div> },
    { title: 'Size', dataIndex: 'size', width: 120, render: (value) => value ?? 'Without size' },
    { title: 'Inspection Quantity', dataIndex: 'quantityInspection', width: 160 },
    { title: 'Maintenance Quantity', dataIndex: 'quantityMaintenance', width: 170 },
    { title: 'Inspection Price', dataIndex: 'priceInspection', width: 150, align: 'right', render: money },
    { title: 'Maintenance Price', dataIndex: 'priceMaintenance', width: 160, align: 'right', render: money },
    { title: 'Subtotal', dataIndex: 'subTotal', width: 150, align: 'right', render: money },
  ]
  const columns = [
    { title: 'Number', dataIndex: 'no', width: 140, render: (_, record) => record.no == null || record.numberYear == null ? 'Draft' : `${record.no}/${record.numberYear}`,
      filteredValue: listFilters.no ? [listFilters.no] : null, filterDropdown: (props) => <QuotationNumberFilter {...props} /> },
    { title: 'Revision', dataIndex: 'revision', width: 100, align: 'center', render: (value) => value ?? 0 },
    { title: 'Date', dataIndex: 'date', width: 150, render: (value) => dateValue(value) || 'Draft',
      filteredValue: listFilters.dateFrom || listFilters.dateTo ? [listFilters.dateFrom || '', listFilters.dateTo || ''] : null,
      filterDropdown: (props) => <QuotationDateFilter {...props} /> },
    { title: 'Subject', dataIndex: 'subject', width: 260 },
    { title: 'Company', key: 'company', render: (_, record) => record.companyName ?? record.companySnapshot?.name ?? '-', width: 200,
      filteredValue: listFilters.company ? [listFilters.company] : null, filterDropdown: (props) => <TableSearchFilter {...props} placeholder="Search company name" maxLength={255} /> },
    { title: 'Customer Contact', dataIndex: 'customerSnapshot', width: 200 },
    { title: 'Status', dataIndex: 'status', width: 200, render: (value) => <Tag>{displayEnum(value)}</Tag>,
      filters: QUOTATION_STATUSES.map((value) => ({ text: displayEnum(value), value })), filterMultiple: false, filteredValue: listFilters.status ? [listFilters.status] : null },
    { title: 'Invoice Status', dataIndex: 'invoiceStatus', width: 170, render: (value) => <Tag>{displayEnum(value)}</Tag>,
      filters: [{ text: 'No Invoice', value: 'null' }, ...QUOTATION_INVOICE_STATUSES.map((value) => ({ text: displayEnum(value), value }))], filterMultiple: false, filteredValue: listFilters.invoiceStatus ? [listFilters.invoiceStatus] : null },
    { title: 'State', dataIndex: 'isActive', width: 110, render: (value) => <Tag>{value ? 'Active' : 'Inactive'}</Tag>,
      filters: canViewInactive ? [{ text: 'Active', value: 'true' }, { text: 'Inactive', value: 'false' }] : undefined,
      filterMultiple: false, filteredValue: canViewInactive && activeFilter ? [activeFilter] : null },
    { title: 'Total', dataIndex: 'total', width: 150, render: (value) => <span style={{ whiteSpace: 'nowrap' }}>{money(value)}</span> },
    { title: 'Actions', key: 'actions', width: 220, fixed: 'right', render: (_, record) => <Space>
      {!readOnly && canUpdateQuotation(record, currentUser) && <Button variant="text" icon={<EditOutlined />} title="Edit Quotation" aria-label={`Edit quotation ${quotationNumber(record)}`} busy={openingId === record.id} disabled={approving || deletingId === record.id} onClick={() => view(record, true)} />}
      {!readOnly && canSubmitQuotation(record) && <Popconfirm title="Submit quotation?" description={record.status === 'REJECTED' ? 'Resubmit this quotation for approval.' : 'Submit this quotation for approval.'} onConfirm={() => transition('submit', record)} okText="Submit" cancelText="Cancel" disabled={approving}>
        <Button variant="text" icon={<SendOutlined />} title="Submit Quotation" aria-label={`Submit quotation ${quotationNumber(record)}`} busy={transitionId === record.id} disabled={approving && transitionId !== record.id} />
      </Popconfirm>}
      {!readOnly && canCopyQuotation(record) && <Button variant="text" icon={<CopyOutlined />} title="Copy Quotation" aria-label={`Copy quotation ${quotationNumber(record)}`} onClick={() => onCopy?.(record.id)} />}
      <Button variant="text" icon={<EyeOutlined />} title="View Quotation" aria-label={`View quotation ${quotationNumber(record)}`} busy={openingId === record.id} onClick={() => view(record)} />
      {record.isActive && <Button variant="text" icon={<FilePdfOutlined />} title="Preview PDF" aria-label={`Preview PDF for quotation ${quotationNumber(record)}`} busy={pdfLoading && pdfPreview?.record.id === record.id} onClick={() => openPdf(record)} />}
      <CreateInvoiceAction currentUser={currentUser} quotation={record} onCreated={load} />
      <CreateWorkOrderAction currentUser={currentUser} quotation={record} />
      {!readOnly && record.isActive && <Popconfirm title="Delete quotation?" description={record.previousQuotationId ? 'This revision will be deactivated and the original quotation restored to approved.' : 'The quotation and its items will be deactivated.'} okText="Delete" cancelText="Cancel" onConfirm={() => remove(record)}>
        <Button variant="text" isDanger icon={<DeleteOutlined />} busy={deletingId === record.id} aria-label={`Delete quotation ${record.no}`} />
      </Popconfirm>}
    </Space> },
  ]
  const detailFields = detail ? [
    ['Number', quotationNumber(detail)], ['Company', detail.companySnapshot?.name], ['Customer Contact', detail.customerSnapshot], ['Date', dateValue(detail.date) || 'Draft'],
    ['Inquiry Method', displayEnum(detail.inquiryMethod)], ['Inquiry Date', dateValue(detail.inquiryDate)],
    ...TEXT_FIELDS.map(([key, label]) => [label, detail[key]]),
    ['Status', displayEnum(detail.status)], ['Invoice Status', displayEnum(detail.invoiceStatus)],
    ['State', detail.isActive ? 'Active' : 'Inactive'],
  ] : []

  return <section className="company-page quotation-page">
    <Modal title={pdfPreview?.title || 'Quotation PDF'} visible={Boolean(pdfPreview)} onCancel={closePdf} width={1100} unmountOnClose footer={<Space>{pdfPreview?.url && <Button href={pdfPreview.url} download={`Quotation-${pdfPreview.record.no ?? 'Draft'}-R${pdfPreview.record.revision ?? 0}.pdf`}>Download PDF</Button>}<Button onClick={closePdf}>Close</Button></Space>}>
      {pdfLoading && <Typography.Text>Loading PDF preview...</Typography.Text>}
      {pdfError && <div role="alert"><Typography.Text tone="danger">{pdfError}</Typography.Text><Button onClick={() => openPdf(pdfPreview.record, pdfPreview.stored)}>Retry</Button></div>}
      {pdfPreview?.url && <iframe title={`${pdfPreview.title} PDF preview`} src={pdfPreview.url} className="quotation-pdf-preview" />}
    </Modal>
    {saveConfirmation}
    <div className="company-page-heading">
      <div><Typography.Title level={2}>Quotation Management</Typography.Title><Typography.Text tone="secondary">Manage customer quotations and their items.</Typography.Text></div>
      {readOnly ? <Tag>View only</Tag> : <Button variant="primary" icon={<PlusOutlined />} onClick={onCreate}>Add Quotation</Button>}
    </div>
    <Card>{loading ? <QuotationSkeleton variant="table" /> : loadError ? <div className="quotation-load-error" role="alert">
      <Typography.Text>Unable to load quotations.</Typography.Text><Button onClick={load}>Retry</Button>
    </div> : <Table className="quotation-content-ready" rowKey="id" columns={columns} dataSource={records} scroll={{ x: 'max-content' }} pagination={{
      current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], showTotal: (count) => `${count} quotations`,
      onChange: (next, size) => { setPage(size !== pageSize ? 1 : next); setPageSize(size) },
    }} onChange={(_, filters, _sorter, extra) => {
      if (extra.action === 'filter') {
        setActiveFilter(filters.isActive?.[0] || '')
        setListFilters({ no: filters.no?.[0] || '', company: String(filters.company?.[0] || '').trim(),
          dateFrom: filters.date?.[0] || '', dateTo: filters.date?.[1] || '',
          status: filters.status?.[0] || '', invoiceStatus: filters.invoiceStatus?.[0] || '' })
        setPage(1)
      }
    }} />}</Card>
    <Modal title={editing ? `Edit Quotation ${quotationNumber(editing)}` : 'Edit Quotation'} visible={!readOnly && open} width={1080}
      okText="Save" cancelText="Cancel" busy={saving} onOk={() => form.submit()} okButtonProps={{ disabled: stale || editingLoading }}
      onCancel={() => { if (!saving) setOpen(false) }} cancelButtonProps={{ disabled: saving }} closable={!saving} mask={{ closable: !saving }} unmountOnClose>
      {editing && <QuotationForm key={editing.id} form={form} record={editing} saving={saving} blocked={stale} onFinish={save} onLoadingChange={setEditingLoading} onAddItem={(item) => changeItem(item)} onRemoveItem={(item) => changeItem(item, true)} />}
      {stale && <Typography.Text tone="warning">Close this form and reopen the quotation to load the latest data.</Typography.Text>}
    </Modal>
    <Modal title={detail ? `Quotation ${quotationNumber(detail)}` : 'Quotation'} visible={detailOpen} width={1080} unmountOnClose
      onCancel={() => { if (!approving && !pdfLoading) setDetailOpen(false) }} closable={!approving && !pdfLoading} afterClose={() => setDetail(null)} footer={detail && <Space wrap>
        {detail.pdfDocument && <Button variant="text" icon={<EyeOutlined />} title="View PDF" aria-label="View quotation PDF" busy={pdfLoading} disabled={approving} onClick={() => openPdf(detail, true)} />}
        {detail.previousQuotationId && <Button disabled={approving || pdfLoading} busy={openingId === detail.previousQuotationId} onClick={() => view({ id: detail.previousQuotationId })}>Previous Revision</Button>}
        {!readOnly && canSubmitQuotation(detail) && <Popconfirm title="Submit quotation?" description={detail.status === 'REJECTED' ? 'Resubmit this quotation for approval.' : 'Submit this quotation for approval.'} onConfirm={() => transition('submit')} okText="Submit" cancelText="Cancel">
          <Button variant="primary" busy={approving} disabled={pdfLoading || Boolean(openingId)}>Submit Quotation</Button>
        </Popconfirm>}
        {canApprove && canApproveQuotation(detail) && <Popconfirm title="Approve quotation?" description="Approval assigns the quotation number and generates its PDF." onConfirm={() => transition('approve')} okText="Approve" cancelText="Cancel">
          <Button variant="primary" busy={approving} disabled={pdfLoading || Boolean(openingId)}>Approve Quotation</Button>
        </Popconfirm>}
        {canApprove && canRejectQuotation(detail) && <Popconfirm title="Reject quotation?" description="This submitted quotation will be marked as rejected." onConfirm={() => transition('reject')} okText="Reject" cancelText="Cancel">
          <Button isDanger busy={approving} disabled={pdfLoading || Boolean(openingId)}>Reject Quotation</Button>
        </Popconfirm>}
        {canApprove && canReviseQuotation(detail) && <Popconfirm title="Revise quotation?" description="Create a draft revision retaining the quotation number. The approved quotation becomes inactive and revised." onConfirm={() => transition('revise')} okText="Revise" cancelText="Cancel">
          <Button busy={approving} disabled={pdfLoading || Boolean(openingId)}>Revise Quotation</Button>
        </Popconfirm>}
        {!readOnly && canUpdateQuotation(detail, currentUser) && <Button variant="primary" icon={<EditOutlined />} disabled={approving || pdfLoading} busy={openingId === detail.id} onClick={() => view(detail, true)}>Update Quotation</Button>}
      </Space>}>
      {detail && <div className="quotation-detail">
        <section className="company-view-section">
          <div className="company-view-section-heading"><h3>Quotation Information</h3></div>
          <dl className="company-detail-grid">{detailFields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '-'}</dd></div>)}</dl>
        </section>
        <section className="company-view-section">
          <div className="company-view-section-heading"><div><h3>Quotation Items</h3><Typography.Text tone="secondary">Items include historical inactive lines. Stored totals belong to this document.</Typography.Text></div></div>
        <Table rowKey="id" columns={itemColumns} dataSource={detail.items || []} pagination={false} scroll={{ x: 1580 }} />
        </section>
        <section className="company-view-section">
        <div className="company-view-section-heading"><h3>Quotation Totals</h3></div>
        <div className="quotation-totals"><span>Subtotal: <strong>{money(detail.subTotal)}</strong></span><span>Tax ({detail.tax}%): <strong>{money(detail.taxAmount)}</strong></span><span>Total: <strong>{money(detail.total)}</strong></span></div>
        </section>
        <QuotationHistory key={detail.id} record={detail} />
      </div>}
    </Modal>
  </section>
}
