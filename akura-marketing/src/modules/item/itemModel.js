export function createItemPayload(values) {
  return {
    serviceId: values.serviceId,
    name: values.name.trim(),
    uom: values.uom.trim(),
    sizes: (values.sizes || []).map(({ size }) => ({ size: size === null ? null : size.trim() })),
  }
}
