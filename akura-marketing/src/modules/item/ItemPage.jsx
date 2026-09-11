import { useSaveConfirmation } from '../../components/global'
import { useCallback, useEffect, useRef, useState } from "react";
import {
  App,
  Button,
  Card,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  Form,
  Input,
  InputNumber,
  Modal,
  PlusOutlined,
  Popconfirm,
  Select,
  Space,
  Table,
  TableSearchFilter,
  Tag,
  Typography,
} from "../../components/global";
import { serviceService } from "../../services/serviceService";
import { itemService } from "../../services/itemService";
import "../company/CompanyPage.css";
import "./ItemPage.css";
import { downloadFile } from "../../services/downloadFile";

const emptySize = {
  size: "",
  priceServicePrimary: 0,
  priceServiceSisterCompany: 0,
  priceMaintenancePrimary: null,
  priceMaintenanceSisterCompany: null,
};

const DEFAULT_PAGE_SIZE = 20;

function getSortOrder(column, sortBy, sortOrder) {
  if (sortBy !== column) return null;
  return sortOrder === "asc" ? "ascend" : "descend";
}

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatPrice(value) {
  return value == null ? "-" : currencyFormatter.format(Number(value));
}

function nonNegativePriceRule(label, required = false) {
  return {
    validator: (_, value) => {
      if (value === "" || value == null) {
        return required
          ? Promise.reject(new Error(`${label} is required.`))
          : Promise.resolve();
      }
      return Number.isFinite(Number(value)) && Number(value) >= 0
        ? Promise.resolve()
        : Promise.reject(new Error(`${label} must be zero or greater.`));
    },
  };
}

function createItemFormValues(fallbackServiceId = "") {
  return {
    serviceId: fallbackServiceId || undefined,
    name: "",
    sizes: [{ ...emptySize }],
  };
}

function ItemPage() {
  const { message } = App.useApp();
  const [confirmSave, saveConfirmation] = useSaveConfirmation()
  const [form] = Form.useForm();
  const [sizeForm] = Form.useForm();
  const [services, setServices] = useState([]);
  const [items, setItems] = useState([]);
  const [managedSizes, setManagedSizes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sizePagination, setSizePagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [sizePage, setSizePage] = useState(1);
  const [sizePageSize, setSizePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [managedSizeSearch, setManagedSizeSearch] = useState("");
  const [managedSizeSortOrder, setManagedSizeSortOrder] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [itemName, setItemName] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const downloadRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [sizeSaving, setSizeSaving] = useState(false);
  const [managedSizesLoading, setManagedSizesLoading] = useState(false);
  const [removingSizeId, setRemovingSizeId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const requestIdRef = useRef(0);
  const sizeRequestIdRef = useRef(0);
  const selectedServiceId = Form.useWatch("serviceId", form);
  const selectedService = services.find(
    (service) => service.id === selectedServiceId,
  );
  const itemHasMaintenance = Boolean(
    editingItem
      ? editingItem.service?.hasMaintenance
      : selectedService?.hasMaintenance,
  );

  const loadServices = useCallback(async () => {
    try {
      const response = await serviceService.list({
        page: 1,
        limit: 100,
        isActive: "true",
      });
      setServices(response.data?.services || []);
    } catch (error) {
      message.error(error.message);
    }
  }, [message]);

  const loadItems = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const selectedServiceName = services.find(
        (service) => service.id === serviceId,
      )?.name;
      const response = await itemService.list({
        ...(selectedServiceName ? { serviceName: selectedServiceName } : {}),
        name: itemName,
        sortBy,
        sortOrder,
        page,
        limit: pageSize,
      });
      if (requestId !== requestIdRef.current) return;
      setItems(response.data?.items || []);
      setPagination(
        response.data?.pagination || { page, total: 0, totalPages: 1 },
      );
    } catch (error) {
      if (requestId === requestIdRef.current) message.error(error.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [
    itemName,
    message,
    page,
    pageSize,
    serviceId,
    services,
    sortBy,
    sortOrder,
  ]);

  const loadManagedSizes = useCallback(async () => {
    if (!modalOpen || !editingItem?.id) return;

    const requestId = ++sizeRequestIdRef.current;
    setManagedSizesLoading(true);
    try {
      const response = await itemService.listSizes({
        itemId: editingItem.id,
        size: managedSizeSearch,
        page: sizePage,
        limit: sizePageSize,
        sortBy: managedSizeSortOrder ? "size" : "",
        sortOrder: managedSizeSortOrder,
      });
      if (requestId !== sizeRequestIdRef.current) return;
      setManagedSizes(response.data?.sizes || []);
      setSizePagination(
        response.data?.pagination || { page: sizePage, total: 0, totalPages: 1 },
      );
    } catch (error) {
      if (requestId === sizeRequestIdRef.current) message.error(error.message);
    } finally {
      if (requestId === sizeRequestIdRef.current) setManagedSizesLoading(false);
    }
  }, [editingItem?.id, managedSizeSearch, message, modalOpen, sizePage, sizePageSize, managedSizeSortOrder]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    const timeoutId = setTimeout(loadItems, 300);
    return () => clearTimeout(timeoutId);
  }, [loadItems]);

  useEffect(() => {
    const timeoutId = setTimeout(loadManagedSizes, 300);
    return () => clearTimeout(timeoutId);
  }, [loadManagedSizes]);

  const downloadItems = async () => {
    if (downloadRef.current) return;
    downloadRef.current = true;
    setDownloading(true);
    try {
      const { blob } = await itemService.download({
        itemName: itemName.trim(),
        serviceName: services.find((service) => service.id === serviceId)?.name,
      });
      downloadFile(blob, 'akura-normal-prices.xlsx');
    } catch (error) {
      message.error(error.message);
    } finally {
      downloadRef.current = false;
      setDownloading(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEdit = async (itemSize) => {
    try {
      const response = await itemService.get(itemSize.id);
      setSizePage(1);
      setManagedSizeSearch("");
      setManagedSizeSortOrder("");
      setEditingItem(response.data);
      setModalOpen(true);
    } catch (error) {
      message.error(error.message);
    }
  };

  const save = async (values) => {
    if (saving) return;
    if (!await confirmSave('item')) return
    setSaving(true);
    try {
      const sizes = values.sizes.map((size) => ({
        size: size.size.trim(),
        priceServicePrimary: Number(size.priceServicePrimary),
        priceServiceSisterCompany: Number(size.priceServiceSisterCompany),
        priceMaintenancePrimary:
          !itemHasMaintenance || size.priceMaintenancePrimary === "" || size.priceMaintenancePrimary == null
            ? null
            : Number(size.priceMaintenancePrimary),
        priceMaintenanceSisterCompany:
          !itemHasMaintenance || size.priceMaintenanceSisterCompany === "" || size.priceMaintenanceSisterCompany == null
            ? null
            : Number(size.priceMaintenanceSisterCompany),
      }));
      const payload = {
        serviceId: values.serviceId,
        name: values.name.trim(),
        sizes,
      };
      await itemService.create(payload);

      message.success("Item created successfully.");
      setModalOpen(false);
      await loadItems();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addItemSize = async () => {
    const values = await sizeForm.validateFields();
    if (!await confirmSave('item size')) return
    setSizeSaving(true);
    try {
      await itemService.addSize({
        itemId: editingItem.id,
        size: values.size.trim(),
        priceServicePrimary: Number(values.priceServicePrimary),
        priceServiceSisterCompany: Number(values.priceServiceSisterCompany ?? 0),
        priceMaintenancePrimary:
          !itemHasMaintenance || values.priceMaintenancePrimary === "" || values.priceMaintenancePrimary == null
            ? null
            : Number(values.priceMaintenancePrimary),
        priceMaintenanceSisterCompany:
          !itemHasMaintenance || values.priceMaintenanceSisterCompany === "" || values.priceMaintenanceSisterCompany == null
            ? null
            : Number(values.priceMaintenanceSisterCompany),
      });
      message.success("Item size added successfully.");
      sizeForm.resetFields();
      sizeForm.setFieldsValue({ ...emptySize });
      await Promise.all([loadManagedSizes(), loadItems()]);
    } catch (error) {
      message.error(error.message);
    } finally {
      setSizeSaving(false);
    }
  };

  const removeItemSize = async (itemSize) => {
    setRemovingSizeId(itemSize.id);
    try {
      await itemService.removeSize(itemSize.id);
      message.success("Item size deleted successfully.");
      if (managedSizes.length === 1 && sizePage > 1) setSizePage((current) => current - 1);
      else await loadManagedSizes();
    } catch (error) {
      message.error(error.message);
    } finally {
      setRemovingSizeId(null);
    }
  };

  const removeItem = async (item) => {
    try {
      await itemService.remove(item.id);
      message.success("Item deleted successfully.");
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else await loadItems();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleTableChange = (tablePagination, filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || pageSize;
    setPageSize(nextPageSize);
    setPage(nextPageSize !== pageSize ? 1 : tablePagination.current || 1);
    setServiceId(filters.serviceName?.[0] || "");
    setItemName(filters.name?.[0] || "");
    setSortBy(sorter.order ? sorter.columnKey : "");
    setSortOrder(
      sorter.order ? (sorter.order === "ascend" ? "asc" : "desc") : "",
    );
  };

  const handleManagedSizeTableChange = (tablePagination, _filters, sorter) => {
    const nextPageSize = tablePagination.pageSize || sizePageSize;
    setSizePageSize(nextPageSize);
    setSizePage(nextPageSize !== sizePageSize ? 1 : tablePagination.current || 1);
    setManagedSizeSortOrder(
      sorter.order ? (sorter.order === "ascend" ? "asc" : "desc") : "",
    );
  };

  const managedSizeColumns = [
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 130,
      sorter: true,
      sortOrder: managedSizeSortOrder === "asc" ? "ascend" : managedSizeSortOrder === "desc" ? "descend" : null,
      filteredValue: managedSizeSearch ? [managedSizeSearch] : null,
      filterDropdown: (props) => (
        <TableSearchFilter
          {...props}
          placeholder="Search size"
          onSearch={(value) => { setManagedSizeSearch(value); setSizePage(1); }}
        />
      ),
      render: (value) => <Tag>{value}</Tag>,
    },
    { title: "Primary Service", dataIndex: "priceServicePrimary", key: "priceServicePrimary", width: 160, render: formatPrice },
    { title: "Sister Service", dataIndex: "priceServiceSisterCompany", key: "priceServiceSisterCompany", width: 160, render: formatPrice },
    { title: "Primary Maintenance", dataIndex: "priceMaintenancePrimary", key: "priceMaintenancePrimary", width: 180, render: formatPrice },
    { title: "Sister Maintenance", dataIndex: "priceMaintenanceSisterCompany", key: "priceMaintenanceSisterCompany", width: 180, render: formatPrice },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      fixed: "right",
      render: (_, itemSize) => (
        <Popconfirm
          title="Delete item size?"
          description="Only this size and its active prices will be deactivated."
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={() => removeItemSize(itemSize)}
        >
          <Button
            isDanger
            variant="text"
            busy={removingSizeId === itemSize.id}
            icon={<DeleteOutlined />}
            aria-label={`Delete size ${itemSize.size}`}
          />
        </Popconfirm>
      ),
    },
  ];

  const columns = [
    {
      title: "Service",
      dataIndex: "service",
      key: "serviceName",
      width: 260,
      sorter: true,
      sortOrder: getSortOrder("serviceName", sortBy, sortOrder),
      filters: services.map((service) => ({
        text: service.name,
        value: service.id,
      })),
      filteredValue: serviceId ? [serviceId] : null,
      filterMultiple: false,
      render: (service) => service?.name || "-",
    },
    {
      title: "Item Name",
      dataIndex: "name",
      key: "name",
      width: 280,
      sorter: true,
      sortOrder: getSortOrder("name", sortBy, sortOrder),
      filteredValue: itemName ? [itemName] : null,
      filterDropdown: (props) => (
        <TableSearchFilter
          {...props}
          placeholder="Search item name"
          onSearch={(value) => {
            setItemName(value);
            setPage(1);
          }}
        />
      ),
      render: (value) => value || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, item) => (
        <Space>
          <Button
            variant="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(item)}
            aria-label={`Manage sizes for ${item.name || "item"}`}
          />
          <Popconfirm
            title="Delete item?"
            description="The item and all of its active sizes will be deactivated."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeItem(item)}
          >
            <Button
              isDanger
              variant="text"
              icon={<DeleteOutlined />}
              aria-label={`Delete ${item.name || "item"}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <section className="company-page item-page">
      {saveConfirmation}
      <div className="company-page-heading item-page-heading">
        <div>
          <Typography.Title level={2}>Item Service</Typography.Title>
          <Typography.Text tone="secondary">
            Manage items and pricing by service.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<DownloadOutlined />} busy={downloading} onClick={downloadItems}>Download Items</Button>
          <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Item</Button>
        </Space>
      </div>

      <Card>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={items}
          tableLayout="fixed"
          scroll={{ x: 700 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} item`,
          }}
        />
      </Card>

      <Modal
        title={editingItem ? `Manage Item Sizes: ${editingItem.name}` : "Add Item"}
        visible={modalOpen}
        width={editingItem || itemHasMaintenance ? 1080 : 760}
        busy={!editingItem && saving}
        footer={editingItem ? null : undefined}
        okText="Add"
        cancelText="Cancel"
        onOk={editingItem ? undefined : () => form.submit()}
        onCancel={() => setModalOpen(false)}
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        keyboard={!saving}
        mask={{ closable: !saving }}
        unmountOnClose
      >
        {editingItem && (
          <div className="item-size-manager">
            <div className="item-size-manager-summary">
              <div>
                <Typography.Text tone="secondary">Service</Typography.Text>
                <strong>{editingItem.service?.name || "-"}</strong>
              </div>
              <div>
                <Typography.Text tone="secondary">Item</Typography.Text>
                <strong>{editingItem.name}</strong>
              </div>
            </div>

            <Form key={editingItem.id} form={sizeForm} layout="vertical" preserve={false} clearOnDestroy initialValues={{ ...emptySize }} className="item-add-size-form">
              <div className="item-add-size-heading">
                <div>
                  <Typography.Text strong>Add Item Size</Typography.Text>
                  <Typography.Text tone="secondary">Add one size and its prices to this item.</Typography.Text>
                </div>
              </div>
              <div className={`item-add-size-grid ${itemHasMaintenance ? "has-maintenance" : ""}`}>
                <Form.Item name="size" label="Size" rules={[
                  { required: true, whitespace: true, message: "Size is required." },
                  { max: 100 },
                ]}>
                  <Input maxLength={100} placeholder="Size" />
                </Form.Item>
                <Form.Item name="priceServicePrimary" label="Primary Service" rules={[nonNegativePriceRule("Primary service price", true)]}>
                  <InputNumber min={0} placeholder="Primary price" />
                </Form.Item>
                <Form.Item name="priceServiceSisterCompany" label="Sister Service" rules={[nonNegativePriceRule("Sister company service price")] }>
                  <InputNumber min={0} placeholder="Default: 0" />
                </Form.Item>
                {itemHasMaintenance && (
                  <>
                    <Form.Item name="priceMaintenancePrimary" label="Primary Maintenance" rules={[nonNegativePriceRule("Primary maintenance price")] }>
                      <InputNumber min={0} placeholder="Optional" />
                    </Form.Item>
                    <Form.Item name="priceMaintenanceSisterCompany" label="Sister Maintenance" rules={[nonNegativePriceRule("Sister company maintenance price")] }>
                      <InputNumber min={0} placeholder="Optional" />
                    </Form.Item>
                  </>
                )}
                <Button className="item-add-size-button" variant="primary" icon={<PlusOutlined />} busy={sizeSaving} onClick={addItemSize}>
                  Add Size
                </Button>
              </div>
            </Form>

            <div className="item-managed-sizes">
              <Typography.Text strong>Active Sizes</Typography.Text>
              <Table
                rowKey="id"
                busy={managedSizesLoading}
                columns={managedSizeColumns}
                dataSource={managedSizes}
                pagination={{
                  current: sizePagination.page,
                  pageSize: sizePageSize,
                  total: sizePagination.total,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 50, 100],
                  showTotal: (total) => `${total} active size`,
                }}
                onChange={handleManagedSizeTableChange}
                scroll={{ x: 970 }}
                size="small"
              />
            </div>
          </div>
        )}

        {!editingItem && <Form form={form} layout="vertical" preserve={false} clearOnDestroy initialValues={createItemFormValues(serviceId)} onFinish={save} disabled={saving}>
          <>
              <Form.Item
                name="serviceId"
                label="Service"
                rules={[{ required: true, message: "Service is required." }]}
              >
                <Select
                  placeholder="Select a service"
                  showSearch
                  optionFilterProp="label"
                  options={services.map((service) => ({
                    value: service.id,
                    label: service.name,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="name"
                label="Name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Name is required.",
                  },
                  { max: 200 },
                ]}
              >
                <Input maxLength={200} />
              </Form.Item>
          </>

          <Form.List
            name="sizes"
            rules={[
              {
                validator: async (_, sizes) => {
                  if (!sizes?.length) throw new Error("At least one size is required.");
                  if (sizes.length > 100) throw new Error("A maximum of 100 sizes is allowed.");
                },
              },
            ]}
          >
            {(fields, { add, remove: removeSize }, { errors }) => (
              <div className="item-sizes">
                <div className="item-sizes-heading">
                  <Typography.Text strong>Sizes and Prices</Typography.Text>
                  <Button
                    variant="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ ...emptySize })}
                    disabled={fields.length >= 100}
                  >
                    Add Size
                  </Button>
                </div>

                {fields.map(({ key, ...field }) => (
                  <div className={`item-size-row ${itemHasMaintenance ? "has-maintenance" : ""}`} key={key}>
                    <Form.Item
                      {...field}
                      name={[field.name, "size"]}
                      label="Size"
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: "Size is required.",
                        },
                        { max: 100 },
                      ]}
                    >
                      <Input maxLength={100} placeholder="Size" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "priceServicePrimary"]}
                      label="Primary Service"
                      required
                      rules={[nonNegativePriceRule("Primary service price", true)]}
                    >
                      <InputNumber min={0} placeholder="Primary price" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "priceServiceSisterCompany"]}
                      label="Sister Service"
                      required
                      rules={[nonNegativePriceRule("Sister company service price", true)]}
                    >
                      <InputNumber min={0} placeholder="Sister price" />
                    </Form.Item>
                    {itemHasMaintenance && (
                      <>
                        <Form.Item
                          {...field}
                          name={[field.name, "priceMaintenancePrimary"]}
                          label="Primary Maintenance"
                          required
                          rules={[nonNegativePriceRule("Primary maintenance price", true)]}
                        >
                          <InputNumber min={0} placeholder="Required" />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "priceMaintenanceSisterCompany"]}
                          label="Sister Maintenance"
                          rules={[nonNegativePriceRule("Sister company maintenance price")]}
                        >
                          <InputNumber min={0} placeholder="Optional" />
                        </Form.Item>
                      </>
                    )}
                    <Button
                      isDanger
                      variant="text"
                      icon={<DeleteOutlined />}
                      onClick={() => removeSize(field.name)}
                      disabled={fields.length <= 1}
                      aria-label="Delete size"
                    />
                  </div>
                ))}
                <Form.ErrorList errors={errors} />
              </div>
            )}
          </Form.List>
        </Form>}
      </Modal>
    </section>
  );
}

export default ItemPage;
