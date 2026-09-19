export const businessDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now)

export function canReceiveContractPrices(contract, today = businessDate()) {
  return contract?.isActive === true && contract.status === 'ACTIVE'
    && String(contract.effectiveUntil || '').slice(0, 10) > today
}

// Match the import endpoint: currently valid first, otherwise earliest future ACTIVE contract.
export function selectImportContract(contracts, today = businessDate()) {
  const eligible = contracts.filter((contract) => canReceiveContractPrices(contract, today))
  return eligible.filter((contract) => contract.effectiveFrom.slice(0, 10) <= today)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || a.id.localeCompare(b.id))[0]
    || eligible.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id.localeCompare(b.id))[0]
    || null
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
