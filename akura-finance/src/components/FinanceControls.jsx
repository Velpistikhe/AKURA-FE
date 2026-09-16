import { forwardRef } from 'react'
import { Button as AntButton, Modal as AntModal, Tooltip } from 'antd'

// Keep Finance controls consistent with Marketing, including portaled dialogs.
export const Button = forwardRef(({ className, ...props }, ref) => {
  const button = <AntButton ref={ref} className={['finance-button', className].filter(Boolean).join(' ')} {...props} />
  return !props.children && props['aria-label'] ? <Tooltip title={props['aria-label']}>{button}</Tooltip> : button
})
Button.displayName = 'FinanceButton'

export function Modal({ rootClassName, ...props }) {
  return <AntModal rootClassName={['finance-modal', rootClassName].filter(Boolean).join(' ')} {...props} />
}
