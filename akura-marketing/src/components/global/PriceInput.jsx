import { forwardRef } from 'react'
import { InputNumber } from './AntdComponents'
import { formatPriceInput, parsePriceInput } from './priceFormat'

const PriceInput = forwardRef(({ maxDigits = 16, ...props }, ref) => (
  <InputNumber {...props} ref={ref} stringMode precision={2} decimalSeparator="," inputMode="decimal"
    max={`${'9'.repeat(maxDigits)}.99`} formatter={(value) => formatPriceInput(value)} parser={parsePriceInput} style={{ width: '100%' }} />
))
PriceInput.displayName = 'PriceInput'
export default PriceInput
