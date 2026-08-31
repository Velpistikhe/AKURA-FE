import { useCallback, useEffect, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  DeleteOutlined,
  Form,
  Input,
  Modal,
  PlusOutlined,
  Popconfirm,
  Space,
  Switch,
  Table,
  TableSearchFilter,
  Tag,
  Typography,
} from '../../components/global'
import '../company/CompanyPage.css'
import './CatalogPage.css'

const DEFAULT_PAGE_SIZE = 20

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null
  return sortOrder === 'asc' ? 'ascend' : 'descend'
}

function scopeValues(scopes = []) {
  return scopes.map((scope) => typeof scope === 'string' ? scope : scope.scope)
}

function CatalogPage({
  entityLabel,
  entityLabelLower,
  dataKey,
  service,
  canDelete,
  canDeleteScope = false,
  supportsMaintenance = false,
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [scopeForm] = Form.useForm()
  const [maintenanceScopeForm] = Form.useForm()
  const [maintenanceForm] = Form.useForm()
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [codeFilter, setCodeFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const [detailRecord, setDetailRecord] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [scopeSaving, setScopeSaving] = useState(false)
  const [maintenanceScopeSaving, setMaintenanceScopeSaving] = useState(false)
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)
  const [deletingScopeId, setDeletingScopeId] = useState(null)
  const [deletingMaintenanceScopeId, setDeletingMaintenanceScopeId] = useState(null)
  const requestIdRef = useRef(0)
  const hasMaintenance = Form.useWatch('hasService', form)
  const viewHasMaintenance = Form.useWatch('hasService', maintenanceForm)

  const loadRecords = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const response = await service.list({
        page,
        limit: pageSize,
        code: codeFilter,
        name: nameFilter,
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
  }, [activeFilter, codeFilter, dataKey, message, nameFilter, page, pageSize, service, sortBy, sortOrder])

  useEffect(() => {
    const timeoutId = setTimeout(loadRecords, 300)
    return () => clearTimeout(timeoutId)
  }, [loadRecords])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({
      code: '',
      name: '',
      scopes: [],
      hasService: false,
      maintenance: { name: '', scopes: [] },
    })
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
      scopeForm.resetFields()
      maintenanceScopeForm.resetFields()
      maintenanceForm.resetFields()
      maintenanceForm.setFieldsValue({ hasService: Boolean(detail.hasService), name: '', scopes: [] })
      setDetailRecord(detail)
    }
  }

  const refreshDetail = async () => {
    const detailResponse = await service.get(detailRecord.id)
    setDetailRecord(detailResponse.data)
    await loadRecords()
  }

  const saveScope = async (values) => {
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

  const saveMaintenance = async (values) => {
    const scopes = scopeValues(values.scopes).map((scope) => scope.trim())
    if (new Set(scopes).size !== scopes.length) {
      message.error('Maintenance scopes must be unique.')
      return
    }
    setMaintenanceSaving(true)
    try {
      await service.createMaintenance(detailRecord.id, {
        name: values.name.trim(),
        scopes,
      })
      message.success('Maintenance added successfully.')
      maintenanceForm.resetFields()
      await refreshDetail()
    } catch (error) {
      message.error(error.message)
    } finally {
      setMaintenanceSaving(false)
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
    const values = await form.validateFields()
    const scopes = scopeValues(values.scopes).map((scope) => scope.trim())
    const maintenanceScopes = scopeValues(values.maintenance?.scopes).map((scope) => scope.trim())
    if (new Set(scopes).size !== scopes.length) {
      message.error('Scopes must be unique.')
      return
    }
    if (values.hasService && new Set(maintenanceScopes).size !== maintenanceScopes.length) {
      message.error('Maintenance scopes must be unique.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
      }
      await service.create({
        ...payload,
        scopes,
        ...(supportsMaintenance ? {
          hasService: Boolean(values.hasService),
          maintenance: values.hasService ? {
            name: values.maintenance.name.trim(),
            scopes: maintenanceScopes,
          } : undefined,
        } : {}),
      })

      message.success(`${entityLabel} created successfully.`)
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
    setPageSize(nextPageSize)
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1)
    setCodeFilter(filters.code?.[0] || '')
    setNameFilter(filters.name?.[0] || '')
    setActiveFilter(filters.isActive?.[0] || '')
    setSortBy(sorter.order ? sorter.field : '')
    setSortOrder(sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : '')
  }

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      ellipsis: true,
      sorter: true,
      sortOrder: getSortOrder('code', sortBy, sortOrder),
      filteredValue: codeFilter ? [codeFilter] : null,
      filterDropdown: (props) => (
        <TableSearchFilter {...props} placeholder="Search code" onSearch={(value) => { setCodeFilter(value); setPage(1) }} />
      ),
      render: (value) => <Typography.Text code title={value}>{value}</Typography.Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      ellipsis: true,
      sorter: true,
      sortOrder: getSortOrder('name', sortBy, sortOrder),
      filteredValue: nameFilter ? [nameFilter] : null,
      filterDropdown: (props) => (
        <TableSearchFilter {...props} placeholder="Search name" onSearch={(value) => { setNameFilter(value); setPage(1) }} />
      ),
      render: (value) => <Typography.Text title={value}>{value}</Typography.Text>,
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
      dataIndex: 'maintenance',
      key: 'maintenance',
      width: 240,
      ellipsis: true,
      render: (maintenance) => maintenance?.name
        ? <Typography.Text title={maintenance.name}>{maintenance.name}</Typography.Text>
        : <Typography.Text tone="secondary">None</Typography.Text>,
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
          scroll={{ x: supportsMaintenance ? 1490 : 1250 }}
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
        title={`Add ${entityLabel}`}
        visible={modalOpen}
        width={680}
        busy={saving}
        okText="Add"
        cancelText="Cancel"
        onOk={saveRecord}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="code" label="Code" rules={[{ required: true, whitespace: true, message: 'Code is required.' }, { max: 50 }, { pattern: /^[A-Z0-9_-]+$/, message: 'Use uppercase letters, numbers, underscores, or hyphens.' }]}>
            <Input maxLength={50} placeholder="example: SOCIAL_MEDIA" />
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
                  <Form.Item name="hasService" label="Has maintenance service" valuePropName="checked">
                    <Switch activeLabel="Yes" inactiveLabel="No" />
                  </Form.Item>
                  {hasMaintenance && (
                    <div className="catalog-maintenance-panel">
                      <Form.Item
                        name={['maintenance', 'name']}
                        label="Maintenance Name"
                        rules={[{ required: true, whitespace: true, message: 'Maintenance name is required.' }, { max: 200 }]}
                      >
                        <Input maxLength={200} placeholder="Maintenance name" />
                      </Form.Item>
                      <Form.List name={['maintenance', 'scopes']}>
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
          </>
        </Form>
      </Modal>

      <Modal className="catalog-view-modal" title={`View ${entityLabelLower}`} visible={Boolean(detailRecord)} width={800} footer={null} onCancel={() => setDetailRecord(null)} unmountOnClose>
        {detailRecord && (
          <div className="catalog-detail">
            <div><span>Code</span><Typography.Text code>{detailRecord.code}</Typography.Text></div>
            <div><span>Name</span><strong>{detailRecord.name}</strong></div>
            <div><span>Status</span><Tag color={detailRecord.isActive ? 'success' : 'default'}>{detailRecord.isActive ? 'Active' : 'Inactive'}</Tag></div>
            {supportsMaintenance && (
              <div>
                <span>Maintenance</span>
                {detailRecord.maintenance ? (
                  <div className="catalog-maintenance-detail">
                    <strong>{detailRecord.maintenance.name}</strong>
                    {detailRecord.isActive && (
                      <Form form={maintenanceScopeForm} className="catalog-detail-scope-form" preserve={false} onFinish={saveMaintenanceScope}>
                        <Form.Item
                          name="scope"
                          rules={[{ required: true, whitespace: true, message: 'Maintenance scope is required.' }, { max: 500 }]}
                        >
                          <Input maxLength={500} placeholder="Enter a new maintenance scope" />
                        </Form.Item>
                        <Button variant="primary" icon={<PlusOutlined />} htmlType="submit" busy={maintenanceScopeSaving}>Add</Button>
                      </Form>
                    )}
                    {(detailRecord.maintenance.scopes || []).length ? (
                      <div className="catalog-detail-scopes">
                        {detailRecord.maintenance.scopes.map((scope) => (
                          <div className="catalog-detail-scope" key={scope.id}>
                            <Typography.Text title={scope.scope}>{scope.scope}</Typography.Text>
                            {canDeleteScope && detailRecord.isActive && (
                              <Popconfirm
                                title="Delete maintenance scope?"
                                description="The scope will be deactivated for this maintenance record."
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
                ) : !detailRecord.isActive ? <Typography.Text tone="secondary">The service is inactive; maintenance cannot be managed.</Typography.Text> : (
                    <Form form={maintenanceForm} className="catalog-maintenance-create" layout="vertical" preserve={false} onFinish={saveMaintenance}>
                      <Form.Item name="hasService" label="Has maintenance" valuePropName="checked">
                        <Switch activeLabel="Yes" inactiveLabel="No" />
                      </Form.Item>
                      {viewHasMaintenance && (
                      <>
                        <Form.Item
                          name="name"
                          label="Maintenance Name"
                          rules={[{ required: true, whitespace: true, message: 'Maintenance name is required.' }, { max: 200 }]}
                        >
                          <Input maxLength={200} placeholder="Maintenance name" />
                        </Form.Item>
                        <Form.List name="scopes">
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
                        <Button className="catalog-maintenance-submit" variant="primary" htmlType="submit" busy={maintenanceSaving}>Add Maintenance</Button>
                      </>
                      )}
                    </Form>
                )}
              </div>
            )}
            <div>
              <span>Scopes</span>
              <div className="catalog-detail-scopes-content">
                {detailRecord.isActive && (
                  <Form form={scopeForm} className="catalog-detail-scope-form" preserve={false} onFinish={saveScope}>
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

export default CatalogPage
