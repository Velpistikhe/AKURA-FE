import { useCallback, useEffect, useRef, useState } from "react";
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
  Table,
  TableSearchFilter,
  Tag,
  Typography,
} from "../../components/global";
import { serviceService } from "../../services/serviceService";
import { itemService } from "../../services/itemService";
import "../company/CompanyPage.css";
import "./ItemPage.css";

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
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  return value == null ? "-" : currencyFormatter.format(Number(value));
}

function ItemPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [services, setServices] = useState([]);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [serviceId, setServiceId] = useState("");
  const [itemName, setItemName] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const requestIdRef = useRef(0);
  const selectedServiceId = Form.useWatch("serviceId", form);
  const selectedService = services.find(
    (service) => service.id === selectedServiceId,
  );
  const itemHasMaintenance = Boolean(
    editingItem?.service?.hasService || selectedService?.hasService,
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
        itemName,
        size: sizeFilter,
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
    sizeFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    const timeoutId = setTimeout(loadItems, 300);
    return () => clearTimeout(timeoutId);
  }, [loadItems]);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      serviceId,
      name: "",
      sizes: [{ ...emptySize }],
    });
    setModalOpen(true);
  };

  const openEdit = async (itemSize) => {
    try {
      const response = await itemService.get(itemSize.item.id);
      setEditingItem(response.data);
      form.resetFields();
      form.setFieldsValue({
        serviceId: response.data.serviceId,
        name: response.data.name,
        sizes: response.data.sizes || [],
      });
      setModalOpen(true);
    } catch (error) {
      message.error(error.message);
    }
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const sizes = values.sizes.map((size) => ({
        size: size.size.trim(),
        priceServicePrimary: Number(size.priceServicePrimary),
        priceServiceSisterCompany: Number(size.priceServiceSisterCompany),
        priceMaintenancePrimary:
          size.priceMaintenancePrimary === "" || size.priceMaintenancePrimary == null
            ? null
            : Number(size.priceMaintenancePrimary),
        priceMaintenanceSisterCompany:
          size.priceMaintenanceSisterCompany === "" || size.priceMaintenanceSisterCompany == null
            ? null
            : Number(size.priceMaintenanceSisterCompany),
      }));
      const payload = {
        serviceId: values.serviceId,
        name: values.name.trim(),
        sizes,
      };
      if (editingItem) await itemService.update(editingItem.id, payload);
      else await itemService.create(payload);

      message.success("Item saved successfully.");
      setModalOpen(false);
      await loadItems();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (itemSize) => {
    try {
      await itemService.remove(itemSize.item.id);
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
    setItemName(filters.itemName?.[0] || "");
    setSizeFilter(filters.size?.[0] || "");
    setSortBy(sorter.order ? sorter.columnKey : "");
    setSortOrder(
      sorter.order ? (sorter.order === "ascend" ? "asc" : "desc") : "",
    );
  };

  const columns = [
    {
      title: "Service",
      dataIndex: "item",
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
      render: (item) => item?.service?.name || "-",
    },
    {
      title: "Item Name",
      dataIndex: "item",
      key: "itemName",
      width: 280,
      sorter: true,
      sortOrder: getSortOrder("itemName", sortBy, sortOrder),
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
      render: (item) => item?.name || "-",
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 150,
      sorter: true,
      sortOrder: getSortOrder("size", sortBy, sortOrder),
      filteredValue: sizeFilter ? [sizeFilter] : null,
      filterDropdown: (props) => (
        <TableSearchFilter
          {...props}
          placeholder="Search size"
          onSearch={(value) => {
            setSizeFilter(value);
            setPage(1);
          }}
        />
      ),
      render: (size) => <Tag>{size}</Tag>,
    },
    {
      title: "Primary Service Price",
      dataIndex: "priceServicePrimary",
      key: "priceServicePrimary",
      width: 220,
      render: formatPrice,
    },
    {
      title: "Sister Service Price",
      dataIndex: "priceServiceSisterCompany",
      key: "priceServiceSisterCompany",
      width: 220,
      render: formatPrice,
    },
    {
      title: "Primary Maintenance Price",
      dataIndex: "priceMaintenancePrimary",
      key: "priceMaintenancePrimary",
      width: 230,
      render: formatPrice,
    },
    {
      title: "Sister Maintenance Price",
      dataIndex: "priceMaintenanceSisterCompany",
      key: "priceMaintenanceSisterCompany",
      width: 230,
      render: formatPrice,
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
            aria-label={`Edit ${item.item?.name || "item"}`}
          />
          <Popconfirm
            title="Delete item?"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(item)}
          >
            <Button
              isDanger
              variant="text"
              icon={<DeleteOutlined />}
              aria-label={`Delete ${item.item?.name || "item"}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <section className="company-page item-page">
      <div className="company-page-heading item-page-heading">
        <div>
          <Typography.Title level={2}>Item Service</Typography.Title>
          <Typography.Text tone="secondary">
            Manage items and pricing by service.
          </Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Item
        </Button>
      </div>

      <Card>
        <Table
          rowKey="id"
          busy={loading}
          columns={columns}
          dataSource={items}
          tableLayout="fixed"
          scroll={{ x: 1740 }}
          onChange={handleTableChange}
          pagination={{
            current: pagination.page,
            pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} item sizes`,
          }}
        />
      </Card>

      <Modal
        title={editingItem ? `Edit Item: ${editingItem.name}` : "Add Item"}
        visible={modalOpen}
        width={760}
        busy={saving}
        okText="Save"
        cancelText="Cancel"
        onOk={save}
        onCancel={() => setModalOpen(false)}
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <>
              <Form.Item
                name="serviceId"
                label="Service"
                rules={[{ required: true, message: "Service is required." }]}
              >
                <Select
                  options={services.map((service) => ({
                    value: service.id,
                    label: `${service.code} — ${service.name}`,
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

          <Form.List name="sizes">
            {(fields, { add, remove: removeSize }) => (
              <div className="item-sizes">
                <div className="item-sizes-heading">
                  <Typography.Text strong>Sizes and Prices</Typography.Text>
                  <Button
                    variant="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ ...emptySize })}
                  >
                    Add Size
                  </Button>
                </div>

                {fields.map(({ key, ...field }) => (
                  <div className="item-size-row" key={key}>
                    <Form.Item
                      {...field}
                      name={[field.name, "size"]}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: "Size is required.",
                        },
                        { max: 100 },
                      ]}
                    >
                      <Input placeholder="Size" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "priceServicePrimary"]}
                      rules={[{ required: true }]}
                    >
                      <Input type="number" min="0" placeholder="Primary price" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "priceServiceSisterCompany"]}
                      rules={[{ required: true }]}
                    >
                      <Input type="number" min="0" placeholder="Sister price" />
                    </Form.Item>
                    {itemHasMaintenance && (
                      <>
                        <Form.Item
                          {...field}
                          name={[field.name, "priceMaintenancePrimary"]}
                          rules={[{ required: true }]}
                        >
                          <Input
                            type="number"
                            min="0"
                            placeholder="Primary maint. price"
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "priceMaintenanceSisterCompany"]}
                        >
                          <Input
                            type="number"
                            min="0"
                            placeholder="Sister maint. price"
                          />
                        </Form.Item>
                      </>
                    )}
                    <Button
                      isDanger
                      variant="text"
                      icon={<DeleteOutlined />}
                      onClick={() => removeSize(field.name)}
                      aria-label="Delete size"
                    />
                  </div>
                ))}
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </section>
  );
}

export default ItemPage;
