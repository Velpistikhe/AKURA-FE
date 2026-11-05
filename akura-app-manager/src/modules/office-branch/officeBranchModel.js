export function officeBranchPayload(values, { create = false } = {}) {
  return {
    ...(create ? { name: values.name.trim() } : {}),
    address: values.address.trim(),
    telp: values.telp.trim(),
    email: values.email.trim(),
    isHead: values.isHead,
  }
}
