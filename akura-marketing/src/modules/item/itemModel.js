export function createItemPayload(values) {
  const sizes = (values.sizes || []).map(({ size }) => ({ size: size === null ? null : size.trim() }))
  if (sizes.length > 1 && sizes.some(({ size }) => size === null)) {
    throw new Error('A variant without a size cannot be combined with other sizes.')
  }
  return {
    ...(values.serviceId ? { serviceId: values.serviceId } : {
      inspectionScopes: (values.inspectionScopes || []).map((scope) => scope.trim()),
      maintenanceScopes: (values.maintenanceScopes || []).map((scope) => scope.trim()),
    }),
    name: values.name.trim(),
    uom: values.uom.trim(),
    sizes,
  }
}
