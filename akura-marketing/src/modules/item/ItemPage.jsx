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
      const response = editingItem
        ? await itemService.update(editingItem.id, payload)
        : await itemService.create(payload);

      message.success(response.message || "Item berhasil disimpan.");
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
      const response = await itemService.remove(itemSize.item.id);
      message.success(response.message || "Item berhasil dihapus.");
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
      title: "Nama Item",
      dataIndex: "item",
      key: "itemName",
      width: 280,
      sorter: true,
      sortOrder: getSortOrder("itemName", sortBy, sortOrder),
      filteredValue: itemName ? [itemName] : null,
      filterDropdown: (props) => (
        <TableSearchFilter
          {...props}
          placeholder="Cari nama item"
          onSearch={(value) => {
            setItemName(value);
            setPage(1);
          }}
        />
      ),
      render: (item) => item?.name || "-",
    },
    {
      title: "Ukuran",
      dataIndex: "size",
      key: "size",
      width: 150,
      sorter: true,
      sortOrder: getSortOrder("size", sortBy, sortOrder),
      filteredValue: sizeFilter ? [sizeFilter] : null,
      filterDropdown: (props) => (
        <TableSearchFilter
          {...props}
          placeholder="Cari ukuran"
          onSearch={(value) => {
            setSizeFilter(value);
            setPage(1);
          }}
        />
      ),
      render: (size) => <Tag>{size}</Tag>,
    },
    {
      title: "Harga Service Utama",
      dataIndex: "priceServicePrimary",
      key: "priceServicePrimary",
      width: 220,
      render: formatPrice,
    },
    {
      title: "Harga Service Sister",
      dataIndex: "priceServiceSisterCompany",
      key: "priceServiceSisterCompany",
      width: 220,
      render: formatPrice,
    },
    {
      title: "Harga Maintenance Utama",
      dataIndex: "priceMaintenancePrimary",
      key: "priceMaintenancePrimary",
      width: 230,
      render: formatPrice,
    },
    {
      title: "Harga Maintenance Sister",
      dataIndex: "priceMaintenanceSisterCompany",
      key: "priceMaintenanceSisterCompany",
      width: 230,
      render: formatPrice,
    },
    {
      title: "Aksi",
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
            title="Hapus item?"
            okText="Hapus"
            cancelText="Batal"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(item)}
          >
            <Button
              isDanger
              variant="text"
              icon={<DeleteOutlined />}
              aria-label={`Hapus ${item.item?.name || "item"}`}
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
            Kelola item dan harga berdasarkan service.
          </Typography.Text>
        </div>
        <Button variant="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Tambah item
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
            showTotal: (total) => `${total} ukuran item`,
          }}
        />
      </Card>

      <Modal
        title={editingItem ? `Edit Item: ${editingItem.name}` : "Tambah Item"}
        visible={modalOpen}
        width={760}
        busy={saving}
        okText="Simpan"
        cancelText="Batal"
        onOk={save}
        onCancel={() => setModalOpen(false)}
        unmountOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <>
              <Form.Item
                name="serviceId"
                label="Service"
                rules={[{ required: true, message: "Service wajib dipilih." }]}
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
                label="Nama"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Nama wajib diisi.",
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
                  <Typography.Text strong>Ukuran dan harga</Typography.Text>
                  <Button
                    variant="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ ...emptySize })}
                  >
                    Tambah ukuran
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
                          message: "Ukuran wajib diisi.",
                        },
                        { max: 100 },
                      ]}
                    >
                      <Input placeholder="Ukuran" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "priceServicePrimary"]}
                      rules={[{ required: true }]}
                    >
                      <Input type="number" min="0" placeholder="Harga utama" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "priceServiceSisterCompany"]}
                      rules={[{ required: true }]}
                    >
                      <Input type="number" min="0" placeholder="Harga sister" />
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
                            placeholder="Harga maint. utama"
                          />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "priceMaintenanceSisterCompany"]}
                        >
                          <Input
                            type="number"
                            min="0"
                            placeholder="Harga maint. sister"
                          />
                        </Form.Item>
                      </>
                    )}
                    <Button
                      isDanger
                      variant="text"
                      icon={<DeleteOutlined />}
                      onClick={() => removeSize(field.name)}
                      aria-label="Hapus ukuran"
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
