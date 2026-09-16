export const canManageTaxes = (user) => user?.role === 'ADMIN' && user.section === 'FINANCE' && user.isActive === true && Boolean(user.officeBranchId)

export function taxPayload({ percentage, effectiveFrom }, latestFrom = '') {
  const value = String(percentage ?? '').trim()
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value) || Number(value) > 100) {
    throw new Error('Enter a percentage from 0 to 100 with up to two decimal places.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom || '') || !Number.isFinite(Date.parse(effectiveFrom)) || new Date(effectiveFrom).toISOString().slice(0, 10) !== effectiveFrom) {
    throw new Error('Enter a valid effective date.')
  }
  if (latestFrom && effectiveFrom <= latestFrom.slice(0, 10)) {
    throw new Error(`Effective date must be after ${latestFrom.slice(0, 10)}.`)
  }
  return { percentage: value, effectiveFrom }
}
