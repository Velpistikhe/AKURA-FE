export function decimalPrice(value) {
  if (value == null || value === '') return ''
  const [whole, fraction] = String(value).split('.')
  return `${whole.replace(/^0+(?=\d)/, '')}${fraction === undefined ? '' : `.${fraction}`}`
}

export function formatPriceInput(value) {
  const [whole, fraction] = decimalPrice(value).split('.')
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${fraction === undefined ? '' : `,${fraction}`}`
}

export const parsePriceInput = (value) => String(value ?? '').replaceAll('.', '').replace(',', '.')
