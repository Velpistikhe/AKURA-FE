export function createItemPayload(values) {
  const priceFields = ['priceServicePrimary', 'priceServiceSisterCompany', 'priceMaintenancePrimary', 'priceMaintenanceSisterCompany']
  const sizes = (values.sizes || []).map((entry) => ({
    size: entry.size === null ? null : entry.size.trim(),
    ...Object.fromEntries(priceFields
      .filter((key) => entry[key] !== undefined && entry[key] !== null && entry[key] !== '')
      .map((key) => [key, entry[key]])),
  }))
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
