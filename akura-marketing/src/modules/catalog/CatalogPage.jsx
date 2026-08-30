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
      if (!detail?.id) throw new Error(`Data detail ${entityLabelLower} tidak valid.`)
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
      const response = await service.createScope(detailRecord.id, { scope: values.scope.trim() })
      message.success(response.message)
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
      const response = await service.removeScope(detailRecord.id, scope.id)
      message.success(response.message)
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
      const response = await service.createMaintenanceScope(detailRecord.id, { scope: values.scope.trim() })
      message.success(response.message)
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
      message.error('Scope maintenance tidak boleh duplikat.')
      return
    }
    setMaintenanceSaving(true)
    try {
      const response = await service.createMaintenance(detailRecord.id, {
        name: values.name.trim(),
        scopes,
      })
      message.success(response.message)
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
      const response = await service.removeMaintenanceScope(detailRecord.id, scope.id)
      message.success(response.message)
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
      message.error('Scope tidak boleh duplikat.')
      return
    }
    if (values.hasService && new Set(maintenanceScopes).size !== maintenanceScopes.length) {
      message.error('Scope maintenance tidak boleh duplikat.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
      }
      const response = await service.create({
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

      message.success(response.message)
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
      const response = await service.remove(record.id)
      message.success(response.message)
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
      title: 'Kode',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      ellipsis: true,
      sorter: true,
      sortOrder: getSortOrder('code', sortBy, sortOrder),
      filteredValue: codeFilter ? [codeFilter] : null,
      filterDropdown: (props) => (
        <TableSearchFilter {...props} placeholder="Cari kode" onSearch={(value) => { setCodeFilter(value); setPage(1) }} />
      ),
      render: (value) => <Typography.Text code title={value}>{value}</Typography.Text>,
    },
    {
      title: 'Nama',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      ellipsis: true,
      sorter: true,
      sortOrder: getSortOrder('name', sortBy, sortOrder),
      filteredValue: nameFilter ? [nameFilter] : null,
      filterDropdown: (props) => (
        <TableSearchFilter {...props} placeholder="Cari nama" onSearch={(value) => { setNameFilter(value); setPage(1) }} />
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
          : <Typography.Text tone="secondary">Tanpa scope</Typography.Text>
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      sorter: true,
      sortOrder: getSortOrder('isActive', sortBy, sortOrder),
      filters: [{ text: 'Aktif', value: 'true' }, { text: 'Nonaktif', value: 'false' }],
      filterMultiple: false,
      filteredValue: activeFilter ? [activeFilter] : null,
      render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Aktif' : 'Nonaktif'}</Tag>,
    },
    ...(supportsMaintenance ? [{
      title: 'Maintenance',
      dataIndex: 'maintenance',
      key: 'maintenance',
      width: 240,
      ellipsis: true,
      render: (maintenance) => maintenance?.name
        ? <Typography.Text title={maintenance.name}>{maintenance.name}</Typography.Text>
        : <Typography.Text tone="secondary">Tidak ada</Typography.Text>,
    }] : []),
    {
      title: 'Aksi',
      key: 'actions',
      width: canDelete ? 200 : 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button variant="link" busy={loadingDetailId === record.id} onClick={() => openDetail(record)}>View</Button>
          {canDelete && (
            <Popconfirm title={`Hapus ${entityLabelLower}?`} okText="Hapus" cancelText="Batal" okButtonProps={{ danger: true }} onConfirm={() => deleteRecord(record)}>
              <Button isDanger variant="text" icon={<DeleteOutlined />} aria-label={`Hapus ${record.name}`} />
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
          <Typography.Title level={2}>Pengelolaan {entityLabel}</Typography.Title>
          <Typography.Text tone="secondary">Kelola katalog {entityLabelLower} pada layanan Marketing Akura.</Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>Tambah {entityLabelLower}</Button>
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
        title={`Tambah ${entityLabelLower}`}
        visible={modalOpen}
        width={680}
        busy={saving}
        okText="Tambah"
        cancelText="Batal"
        onOk={saveRecord}
        onCancel={() => setModalOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="code" label="Kode" rules={[{ required: true, whitespace: true, message: 'Kode wajib diisi.' }, { max: 50 }, { pattern: /^[A-Z0-9_-]+$/, message: 'Gunakan huruf kapital, angka, underscore, atau tanda hubung.' }]}>
            <Input maxLength={50} placeholder="contoh: SOCIAL_MEDIA" />
          </Form.Item>
          <Form.Item name="name" label="Nama" rules={[{ required: true, whitespace: true, message: 'Nama wajib diisi.' }, { max: 200 }]}>
            <Input maxLength={200} placeholder={`Nama ${entityLabelLower}`} />
          </Form.Item>
          <>
              <Form.List name="scopes">
                {(fields, { add, remove }) => (
                  <div className="catalog-scopes">
                    <div className="catalog-scopes-heading">
                      <Typography.Text strong>Scopes</Typography.Text>
                      <Button variant="dashed" icon={<PlusOutlined />} onClick={() => add('')}>Tambah scope</Button>
                    </div>
                    {fields.map(({ key, ...fieldProps }) => (
                      <div className="catalog-scope-row" key={key}>
                        <Form.Item {...fieldProps} rules={[{ required: true, whitespace: true, message: 'Scope wajib diisi.' }, { max: 500 }]}>
                          <Input maxLength={500} placeholder="Nama scope" />
                        </Form.Item>
                        <Button isDanger variant="text" icon={<DeleteOutlined />} onClick={() => remove(fieldProps.name)} aria-label="Hapus scope" />
                      </div>
                    ))}
                  </div>
                )}
              </Form.List>

              {supportsMaintenance && (
                <div className="catalog-maintenance-fields">
                  <Form.Item name="hasService" label="Memiliki service maintenance" valuePropName="checked">
                    <Switch activeLabel="Ya" inactiveLabel="Tidak" />
                  </Form.Item>
                  {hasMaintenance && (
                    <div className="catalog-maintenance-panel">
                      <Form.Item
                        name={['maintenance', 'name']}
                        label="Nama maintenance"
                        rules={[{ required: true, whitespace: true, message: 'Nama maintenance wajib diisi.' }, { max: 200 }]}
                      >
                        <Input maxLength={200} placeholder="Nama maintenance" />
                      </Form.Item>
                      <Form.List name={['maintenance', 'scopes']}>
                        {(fields, { add, remove }) => (
                          <div className="catalog-scopes catalog-maintenance-scopes">
                            <div className="catalog-scopes-heading">
                              <Typography.Text strong>Scope maintenance</Typography.Text>
                              <Button variant="dashed" icon={<PlusOutlined />} onClick={() => add('')}>Tambah scope</Button>
                            </div>
                            {fields.map(({ key, ...fieldProps }) => (
                              <div className="catalog-scope-row" key={key}>
                                <Form.Item {...fieldProps} rules={[{ required: true, whitespace: true, message: 'Scope maintenance wajib diisi.' }, { max: 500 }]}>
                                  <Input maxLength={500} placeholder="Nama scope maintenance" />
                                </Form.Item>
                                <Button isDanger variant="text" icon={<DeleteOutlined />} onClick={() => remove(fieldProps.name)} aria-label="Hapus scope maintenance" />
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
            <div><span>Kode</span><Typography.Text code>{detailRecord.code}</Typography.Text></div>
            <div><span>Nama</span><strong>{detailRecord.name}</strong></div>
            <div><span>Status</span><Tag color={detailRecord.isActive ? 'success' : 'default'}>{detailRecord.isActive ? 'Aktif' : 'Nonaktif'}</Tag></div>
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
                          rules={[{ required: true, whitespace: true, message: 'Scope maintenance wajib diisi.' }, { max: 500 }]}
                        >
                          <Input maxLength={500} placeholder="Masukkan scope maintenance baru" />
                        </Form.Item>
                        <Button variant="primary" icon={<PlusOutlined />} htmlType="submit" busy={maintenanceScopeSaving}>Tambah</Button>
                      </Form>
                    )}
                    {(detailRecord.maintenance.scopes || []).length ? (
                      <div className="catalog-detail-scopes">
                        {detailRecord.maintenance.scopes.map((scope) => (
                          <div className="catalog-detail-scope" key={scope.id}>
                            <Typography.Text title={scope.scope}>{scope.scope}</Typography.Text>
                            {canDeleteScope && detailRecord.isActive && (
                              <Popconfirm
                                title="Hapus scope maintenance?"
                                description="Scope akan dinonaktifkan dari maintenance ini."
                                okText="Hapus"
                                cancelText="Batal"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => deleteMaintenanceScope(scope)}
                              >
                                <Button
                                  isDanger
                                  variant="text"
                                  busy={deletingMaintenanceScopeId === scope.id}
                                  icon={<DeleteOutlined />}
                                  aria-label={`Hapus scope maintenance ${scope.scope}`}
                                />
                              </Popconfirm>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : <Typography.Text tone="secondary">Tanpa scope maintenance</Typography.Text>}
                  </div>
                ) : !detailRecord.isActive ? <Typography.Text tone="secondary">Service nonaktif; maintenance tidak dapat dikelola.</Typography.Text> : (
                    <Form form={maintenanceForm} className="catalog-maintenance-create" layout="vertical" preserve={false} onFinish={saveMaintenance}>
                      <Form.Item name="hasService" label="Memiliki maintenance" valuePropName="checked">
                        <Switch activeLabel="Ya" inactiveLabel="Tidak" />
                      </Form.Item>
                      {viewHasMaintenance && (
                      <>
                        <Form.Item
                          name="name"
                          label="Nama maintenance"
                          rules={[{ required: true, whitespace: true, message: 'Nama maintenance wajib diisi.' }, { max: 200 }]}
                        >
                          <Input maxLength={200} placeholder="Nama maintenance" />
                        </Form.Item>
                        <Form.List name="scopes">
                          {(fields, { add, remove }) => (
                            <div className="catalog-scopes catalog-maintenance-scopes">
                              <div className="catalog-scopes-heading">
                                <Typography.Text strong>Scope maintenance</Typography.Text>
                                <Button variant="dashed" icon={<PlusOutlined />} onClick={() => add('')}>Tambah scope</Button>
                              </div>
                              {fields.map(({ key, ...fieldProps }) => (
                                <div className="catalog-scope-row" key={key}>
                                  <Form.Item {...fieldProps} rules={[{ required: true, whitespace: true, message: 'Scope maintenance wajib diisi.' }, { max: 500 }]}>
                                    <Input maxLength={500} placeholder="Nama scope maintenance" />
                                  </Form.Item>
                                  <Button isDanger variant="text" icon={<DeleteOutlined />} onClick={() => remove(fieldProps.name)} aria-label="Hapus scope maintenance" />
                                </div>
                              ))}
                            </div>
                          )}
                        </Form.List>
                        <Button className="catalog-maintenance-submit" variant="primary" htmlType="submit" busy={maintenanceSaving}>Tambah maintenance</Button>
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
                      rules={[{ required: true, whitespace: true, message: 'Scope wajib diisi.' }, { max: 500 }]}
                    >
                      <Input maxLength={500} placeholder="Masukkan scope baru" />
                    </Form.Item>
                    <Button variant="primary" icon={<PlusOutlined />} htmlType="submit" busy={scopeSaving}>Tambah</Button>
                  </Form>
                )}
                {(detailRecord.scopes || []).length ? (
                  <div className="catalog-detail-scopes">
                    {(detailRecord.scopes || []).map((scope) => (
                      <div className="catalog-detail-scope" key={scope.id}>
                        <Typography.Text title={scope.scope}>{scope.scope}</Typography.Text>
                        {canDeleteScope && detailRecord.isActive && (
                          <Popconfirm
                            title="Hapus scope?"
                            description="Scope akan dinonaktifkan dari service ini."
                            okText="Hapus"
                            cancelText="Batal"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => deleteScope(scope)}
                          >
                            <Button
                              isDanger
                              variant="text"
                              busy={deletingScopeId === scope.id}
                              icon={<DeleteOutlined />}
                              aria-label={`Hapus scope ${scope.scope}`}
                            />
                          </Popconfirm>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <Typography.Text tone="secondary">Tanpa scope</Typography.Text>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

export default CatalogPage
