import { useSaveConfirmation } from '../../components/global'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  DeleteOutlined,
  EditOutlined,
  Form,
  Input,
  Modal,
  PlusOutlined,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  TableSearchFilter,
  Tag,
  Typography,
} from '../../components/global'
import '../company/CompanyPage.css'
import './ServiceCatalogPage.css'

const DEFAULT_PAGE_SIZE = 20
const SERVICE_TYPES = ['TUBULAR', 'OCTG']

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function scopeValues(scopes = []) {
  return scopes.map((scope) => typeof scope === 'string' ? scope : scope.scope)
}

function sameScopes(current, original) {
  const originalValues = scopeValues(original).map((scope) => scope.trim())
  const originalSet = new Set(originalValues)
  return current.length === originalValues.length && current.every((scope) => originalSet.has(scope))
}

function ServiceCatalogPage({
  entityLabel,
  entityLabelLower,
  dataKey,
  service,
  canDelete,
  canDeleteScope = false,
  supportsMaintenance = false,
}) {
  const { message } = App.useApp()
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [form] = Form.useForm()
  const [scopeForm] = Form.useForm()
  const [maintenanceScopeForm] = Form.useForm()
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [nameFilter, setNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [editIsActive, setEditIsActive] = useState(true)
  const [detailRecord, setDetailRecord] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [scopeSaving, setScopeSaving] = useState(false)
  const [maintenanceScopeSaving, setMaintenanceScopeSaving] = useState(false)
  const [deletingScopeId, setDeletingScopeId] = useState(null)
  const [deletingMaintenanceScopeId, setDeletingMaintenanceScopeId] = useState(null)
  const requestIdRef = useRef(0)
  const hasMaintenance = Form.useWatch('hasMaintenance', form)

  const loadRecords = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const response = await service.list({
        page,
        limit: pageSize,
        name: nameFilter,
        type: typeFilter,
        isActive: activeFilter,
        sortBy,
        sortOrder,
      })
      if (requestId !== requestIdRef.current) return
      setRecords(response.data?.[dataKey] || [])
      setPagination(response.data?.pagination || { page, total: 0, totalPages: 1 })
    } catch (error) {
      if (requestId === requestIdRef.current) message.error(error.message)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [activeFilter, dataKey, message, nameFilter, page, pageSize, service, sortBy, sortOrder, typeFilter])

  useEffect(() => {
    const timeoutId = setTimeout(loadRecords, 300)
    return () => clearTimeout(timeoutId)
  }, [loadRecords])

  useEffect(() => {
    if (!modalOpen) return

    setEditIsActive(editingRecord ? editingRecord.isActive === true : true)
    form.resetFields()
    form.setFieldsValue(editingRecord ? {
      name: editingRecord.name,
      type: editingRecord.type,
      scopes: scopeValues(editingRecord.scopes),
      hasMaintenance: Boolean(editingRecord.hasMaintenance),
      maintenanceScopes: scopeValues(editingRecord.maintenanceScopes),
    } : {
      name: '',
      type: undefined,
      scopes: [],
      hasMaintenance: false,
      maintenanceScopes: [],
    })
  }, [editingRecord, form, modalOpen])

  const openCreate = () => {
    setEditingRecord(null)
    setModalOpen(true)
  }

  const getDetail = async (record) => {
    setLoadingDetailId(record.id)
    try {
      const response = await service.get(record.id)
      const detail = response.data
      if (!detail?.id) throw new Error(`Invalid ${entityLabelLower} detail data.`)
      return detail
    } catch (error) {
      message.error(error.message)
      return null
    } finally {
      setLoadingDetailId(null)
    }
  }

  const openDetail = async (record) => {
    const detail = await getDetail(record)
    if (detail) {
      setDetailRecord(detail)
    }
  }

  const openEdit = async (record) => {
    const detail = await getDetail(record)
    if (!detail) return

    setEditingRecord(detail)
    setDetailRecord(null)
    setModalOpen(true)
  }

  const refreshDetail = async () => {
    const detailResponse = await service.get(detailRecord.id)
    setDetailRecord(detailResponse.data)
    await loadRecords()
  }

  const saveScope = async (values) => {
    if (!await confirmSave('service scope')) return
    setScopeSaving(true)
    try {
      await service.createScope(detailRecord.id, { scope: values.scope.trim() })
      message.success('Scope added successfully.')
      scopeForm.resetFields()
      await refreshDetail()
    } catch (error) {
      message.error(error.message)
    } finally {
      setScopeSaving(false)
    }
  }

  const deleteScope = async (scope) => {
    setDeletingScopeId(scope.id)
    try {
      await service.removeScope(detailRecord.id, scope.id)
      message.success('Scope deleted successfully.')
      await refreshDetail()
    } catch (error) {
      message.error(error.message)
    } finally {
      setDeletingScopeId(null)
    }
  }

  const saveMaintenanceScope = async (values) => {
    if (!await confirmSave('maintenance scope')) return
    setMaintenanceScopeSaving(true)
    try {
      await service.createMaintenanceScope(detailRecord.id, { scope: values.scope.trim() })
      message.success('Maintenance scope added successfully.')
      maintenanceScopeForm.resetFields()
      await refreshDetail()
    } catch (error) {
      message.error(error.message)
    } finally {
      setMaintenanceScopeSaving(false)
    }
  }

  const deleteMaintenanceScope = async (scope) => {
    setDeletingMaintenanceScopeId(scope.id)
    try {
      await service.removeMaintenanceScope(detailRecord.id, scope.id)
      message.success('Maintenance scope deleted successfully.')
      await refreshDetail()
    } catch (error) {
      message.error(error.message)
    } finally {
      setDeletingMaintenanceScopeId(null)
    }
  }

  const saveRecord = async () => {
    const currentValues = form.getFieldsValue(true)
    if (editingRecord
      && (currentValues.name || '').trim() === editingRecord.name.trim()
      && currentValues.type === editingRecord.type
      && editIsActive === (editingRecord.isActive === true)
      && sameScopes(scopeValues(currentValues.scopes).map((scope) => scope.trim()), editingRecord.scopes)
      && (!supportsMaintenance || (
        Boolean(currentValues.hasMaintenance) === Boolean(editingRecord.hasMaintenance)
        && (!currentValues.hasMaintenance || sameScopes(
          scopeValues(currentValues.maintenanceScopes).map((scope) => scope.trim()),
          editingRecord.maintenanceScopes,
        ))
      ))) {
      message.warning('No changes were made.')
      return
    }

    let values
    try {
      values = await form.validateFields()
    } catch (error) {
      if (error.errorFields?.length) form.scrollToField(error.errorFields[0].name)
      return
    }
    const scopes = scopeValues(values.scopes).map((scope) => scope.trim())
    const maintenanceScopes = scopeValues(values.maintenanceScopes).map((scope) => scope.trim())
    if (scopes.length > 100 || maintenanceScopes.length > 100) {
      message.error('A service can contain a maximum of 100 scopes in each scope list.')
      return
    }
    if (new Set(scopes).size !== scopes.length) {
      message.error('Scopes must be unique.')
      return
    }
    if (values.hasMaintenance && maintenanceScopes.length === 0) {
      message.error('Add at least one maintenance scope when maintenance is enabled.')
      return
    }
    if (values.hasMaintenance && new Set(maintenanceScopes).size !== maintenanceScopes.length) {
      message.error('Maintenance scopes must be unique.')
      return
    }

    if (!await confirmSave('service')) return
    setSaving(true)
    try {
      const payload = {
        name: values.name.trim(),
        type: values.type,
        scopes,
        ...(supportsMaintenance ? {
          hasMaintenance: Boolean(values.hasMaintenance),
          maintenanceScopes: values.hasMaintenance ? maintenanceScopes : [],
        } : {}),
      }

      if (editingRecord) {
        await service.update(editingRecord.id, { ...payload, isActive: editIsActive })
      } else {
        await service.create(payload)
      }

      message.success(`${entityLabel} ${editingRecord ? 'updated' : 'created'} successfully.`)
      setModalOpen(false)
      await loadRecords()
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteRecord = async (record) => {
    try {
      await service.remove(record.id)
      message.success(`${entityLabel} deleted successfully.`)
      if (records.length === 1 && page > 1) setPage((current) => current - 1)
      else await loadRecords()
    } catch (error) {
      message.error(error.message)
    }
  }

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize
    const nextTypeFilter = filters.type?.[0] || ''
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize || nextTypeFilter !== typeFilter ? 1 : tablePagination.current || 1)
    setNameFilter(filters.name?.[0] || '')
    setTypeFilter(nextTypeFilter)
    setActiveFilter(filters.isActive?.[0] || '')
    setSortBy(sorter.order ? sorter.field : '')
    setSortOrder(sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '')
  }

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      sorter: true,
      sortOrder: getSortOrder('type', sortBy, sortOrder),
      filters: SERVICE_TYPES.map((type) => ({ text: type, value: type })),
      filterMultiple: false,
      filteredValue: typeFilter ? [typeFilter] : null,
      render: (value) => <Typography.Text>{value || '-'}</Typography.Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      sorter: true,
      sortOrder: getSortOrder('name', sortBy, sortOrder),
      filteredValue: nameFilter ? [nameFilter] : null,
      filterDropdown: (props) => (
        <TableSearchFilter {...props} placeholder="Search name" onSearch={(value) => { setNameFilter(value); setPage(1) }} />
      ),
      render: (value) => <Typography.Text className="catalog-service-name" title={value}>{value}</Typography.Text>,
    },
    {
      title: 'Scopes',
      dataIndex: 'scopes',
      key: 'scopes',
      width: 340,
      render: (scopes = '') => {
        const summary = Array.isArray(scopes) ? scopeValues(scopes).join(', ') : String(scopes)
        return summary
          ? <Typography.Text className="catalog-scope-summary" title={summary}>{summary}</Typography.Text>
          : <Typography.Text tone="secondary">No scopes</Typography.Text>
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      sorter: true,
      sortOrder: getSortOrder('isActive', sortBy, sortOrder),
      filters: [{ text: 'Active', value: 'true' }, { text: 'Inactive', value: 'false' }],
      filterMultiple: false,
      filteredValue: activeFilter ? [activeFilter] : null,
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Tag>,
    },
    ...(supportsMaintenance ? [{
      title: 'Maintenance',
      dataIndex: 'maintenanceScopes',
      key: 'maintenanceScopes',
      width: 240,
      ellipsis: true,
      render: (maintenanceScopes, record) => {
        if (!record.hasMaintenance) return <Typography.Text tone="secondary">Disabled</Typography.Text>
        const summary = Array.isArray(maintenanceScopes)
          ? scopeValues(maintenanceScopes).join(', ')
          : String(maintenanceScopes || '')
        return summary
          ? <Typography.Text className="catalog-scope-summary" title={summary}>{summary}</Typography.Text>
          : <Typography.Text tone="secondary">No scopes</Typography.Text>
      },
    }] : []),
    {
      title: 'Actions',
      key: 'actions',
      width: canDelete ? 200 : 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button variant="link" busy={loadingDetailId === record.id} onClick={() => openDetail(record)}>View</Button>
          {canDelete && (
            <Popconfirm title={`Delete ${entityLabelLower}?`} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }} onConfirm={() => deleteRecord(record)}>
              <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label={`Delete ${record.name}`} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <section className="company-page catalog-page">
      {saveConfirmation}
      <div className="company-page-heading">
        <div>
          <Typography.Title level={2}>{entityLabel} Management</Typography.Title>
          <Typography.Text tone="secondary">Manage the {entityLabelLower} catalog in Akura Marketing.</Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>Add {entityLabel}</Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={records}
          tableLayout="fixed"
          scroll={{ x: supportsMaintenance ? 1430 : 1190 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} ${entityLabelLower}`,
          }}
        />
      </Card>

      <Modal
        title={`${editingRecord ? 'Edit' : 'Add'} ${entityLabel}`}
        visible={modalOpen}
        width={680}
        busy={saving}
        okText={editingRecord ? 'Save' : 'Add'}
        cancelText="Cancel"
        onOk={saveRecord}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="type"
            label="Type"
            rules={[
              { required: true, message: 'Service type is required.' },
              { type: 'enum', enum: SERVICE_TYPES, message: 'Select TUBULAR or OCTG.' },
            ]}
          >
            <Select placeholder="Select service type" options={SERVICE_TYPES.map((type) => ({ label: type, value: type }))} />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: 'Name is required.' }, { max: 200 }]}>
            <Input maxLength={200} placeholder={`${entityLabel} name`} />
          </Form.Item>
          <>
              <Form.List name="scopes">
                {(fields, { add, remove }) => (
                  <div className="catalog-scopes">
                    <div className="catalog-scopes-heading">
                      <Typography.Text strong>Scopes</Typography.Text>
                      <Button variant="dashed" icon={<PlusOutlined />} onClick={() => add('')}>Add Scope</Button>
                    </div>
                    {fields.map(({ key, ...fieldProps }) => (
                      <div className="catalog-scope-row" key={key}>
                        <Form.Item {...fieldProps} rules={[{ required: true, whitespace: true, message: 'Scope is required.' }, { max: 500 }]}>
                          <Input maxLength={500} placeholder="Scope name" />
                        </Form.Item>
                        <Button isDanger variant="text" icon={<DeleteOutlined />} onClick={() => remove(fieldProps.name)} aria-label="Delete scope" />
                      </div>
                    ))}
                  </div>
                )}
              </Form.List>

              {supportsMaintenance && (
                <div className="catalog-maintenance-fields">
                  <Form.Item name="hasMaintenance" label="Has maintenance service" valuePropName="checked">
                    <Switch activeLabel="Yes" inactiveLabel="No" />
                  </Form.Item>
                  {hasMaintenance && (
                    <div className="catalog-maintenance-panel">
                      <Form.List name="maintenanceScopes">
                        {(fields, { add, remove }) => (
                          <div className="catalog-scopes catalog-maintenance-scopes">
                            <div className="catalog-scopes-heading">
                              <Typography.Text strong>Maintenance Scopes</Typography.Text>
                              <Button variant="dashed" icon={<PlusOutlined />} onClick={() => add('')}>Add Scope</Button>
                            </div>
                            {fields.map(({ key, ...fieldProps }) => (
                              <div className="catalog-scope-row" key={key}>
                                <Form.Item {...fieldProps} rules={[{ required: true, whitespace: true, message: 'Maintenance scope is required.' }, { max: 500 }]}>
                                  <Input maxLength={500} placeholder="Maintenance scope name" />
                                </Form.Item>
                                <Button isDanger variant="text" icon={<DeleteOutlined />} onClick={() => remove(fieldProps.name)} aria-label="Delete maintenance scope" />
                              </div>
                            ))}
                          </div>
                        )}
                      </Form.List>
                    </div>
                  )}
                </div>
              )}
              {editingRecord && (
                <Form.Item label="Status">
                  <Switch checked={editIsActive} onChange={setEditIsActive} activeLabel="Active" inactiveLabel="Inactive" />
                </Form.Item>
              )}
          </>
        </Form>
      </Modal>

      <Modal
        className="catalog-view-modal"
        title={`View ${entityLabelLower}`}
        visible={Boolean(detailRecord)}
        width={800}
        footer={detailRecord ? (
          <Button
            variant="primary"
            icon={<EditOutlined />}
            busy={loadingDetailId === detailRecord.id}
            onClick={() => openEdit(detailRecord)}
          >
            Update {entityLabel}
          </Button>
        ) : null}
        onCancel={() => setDetailRecord(null)}
        unmountOnClose
      >
        {detailRecord && (
          <div className="catalog-detail">
            <div><span>Type</span><strong>{detailRecord.type || '-'}</strong></div>
            <div><span>Name</span><strong>{detailRecord.name}</strong></div>
            <div><span>Status</span><Tag color={detailRecord.isActive ? 'success' : 'default'}>{detailRecord.isActive ? 'Active' : 'Inactive'}</Tag></div>
            {supportsMaintenance && (
              <div>
                <span>Maintenance</span>
                {detailRecord.hasMaintenance ? (
                  <div className="catalog-maintenance-detail">
                    {detailRecord.isActive && (
                      <Form form={maintenanceScopeForm} className="catalog-detail-scope-form" preserve={false} clearOnDestroy onFinish={saveMaintenanceScope}>
                        <Form.Item
                          name="scope"
                          rules={[{ required: true, whitespace: true, message: 'Maintenance scope is required.' }, { max: 500 }]}
                        >
                          <Input maxLength={500} placeholder="Enter a new maintenance scope" />
                        </Form.Item>
                        <Button variant="primary" icon={<PlusOutlined />} htmlType="submit" busy={maintenanceScopeSaving}>Add</Button>
                      </Form>
                    )}
                    {(detailRecord.maintenanceScopes || []).length ? (
                      <div className="catalog-detail-scopes">
                        {detailRecord.maintenanceScopes.map((scope) => (
                          <div className="catalog-detail-scope" key={scope.id}>
                            <Typography.Text title={scope.scope}>{scope.scope}</Typography.Text>
                            {canDeleteScope && detailRecord.isActive && (
                              <Popconfirm
                                title="Delete maintenance scope?"
                                description="The scope will be deactivated for this service."
                                okText="Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => deleteMaintenanceScope(scope)}
                              >
                                <Button
                                  isDanger
                                  variant="text"
                                  busy={deletingMaintenanceScopeId === scope.id}
                                  icon={<DeleteOutlined />}
                                  aria-label={`Delete maintenance scope ${scope.scope}`}
                                />
                              </Popconfirm>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : <Typography.Text tone="secondary">No maintenance scopes</Typography.Text>}
                  </div>
                ) : <Typography.Text tone="secondary">Maintenance is disabled for this service.</Typography.Text>}
              </div>
            )}
            <div>
              <span>Scopes</span>
              <div className="catalog-detail-scopes-content">
                {detailRecord.isActive && (
                  <Form form={scopeForm} className="catalog-detail-scope-form" preserve={false} clearOnDestroy onFinish={saveScope}>
                    <Form.Item
                      name="scope"
                      rules={[{ required: true, whitespace: true, message: 'Scope is required.' }, { max: 500 }]}
                    >
                      <Input maxLength={500} placeholder="Enter a new scope" />
                    </Form.Item>
                    <Button variant="primary" icon={<PlusOutlined />} htmlType="submit" busy={scopeSaving}>Add</Button>
                  </Form>
                )}
                {(detailRecord.scopes || []).length ? (
                  <div className="catalog-detail-scopes">
                    {(detailRecord.scopes || []).map((scope) => (
                      <div className="catalog-detail-scope" key={scope.id}>
                        <Typography.Text title={scope.scope}>{scope.scope}</Typography.Text>
                        {canDeleteScope && detailRecord.isActive && (
                          <Popconfirm
                            title="Delete scope?"
                            description="The scope will be deactivated for this service."
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => deleteScope(scope)}
                          >
                            <Button
                              isDanger
                              variant="text"
                              busy={deletingScopeId === scope.id}
                              icon={<DeleteOutlined />}
                              aria-label={`Delete scope ${scope.scope}`}
                            />
                          </Popconfirm>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <Typography.Text tone="secondary">No scopes</Typography.Text>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

export default ServiceCatalogPage
