export const businessDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now)

export function canReceiveContractPrices(contract) {
  return contract?.isDeleted !== true && ['DRAFT', 'REJECTED', 'SUBMITTED', 'APPROVED'].includes(contract?.status)
}

// Match the import endpoint: currently valid first, otherwise earliest future APPROVED contract.
export function selectImportContract(contracts, today = businessDate()) {
  const eligible = contracts.filter((contract) => contract.isDeleted !== true && contract.status === 'APPROVED'
    && String(contract.effectiveUntil || '').slice(0, 10) > today)
  return eligible.filter((contract) => contract.effectiveFrom.slice(0, 10) <= today)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || a.id.localeCompare(b.id))[0]
    || eligible.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id.localeCompare(b.id))[0]
    || null
}

export function contractUploadTargets(contracts, today = businessDate()) {
  const available = contracts.filter((contract) => contract.isDeleted !== true)
  const approved = selectImportContract(available, today)
  return [...available.filter((contract) => contract.status === 'DRAFT'), ...(approved ? [approved] : [])]
}

export function contractPricePayload(values, { contractId, version, hasMaintenance = false }) {
  const price = (value, required) => {
    if (value == null || value === '') {
      if (required) throw new Error('Required prices cannot be empty.')
      return null
    }
    if (!/^\d{1,16}(\.\d{1,2})?$/.test(String(value))) throw new Error('Enter a nonnegative price with at most two decimals.')
    return String(value)
  }
  return {
    ...(contractId ? { contractId } : { version }),
    priceService: price(values.priceService, true),
    priceMaintenance: price(values.priceMaintenance, hasMaintenance),
  }
}
