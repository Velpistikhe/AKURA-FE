import { forwardRef } from 'react'
import './ModalMotion.css'
import './Button.css'
import {
  App as AntApp,
  Button as AntButton,
  Card as AntCard,
  Form as AntForm,
  Input as AntInput,
  InputNumber as AntInputNumber,
  Modal as AntModal,
  Popconfirm as AntPopconfirm,
  Result as AntResult,
  Select as AntSelect,
  Space as AntSpace,
  Switch as AntSwitch,
  Table as AntTable,
  Tabs as AntTabs,
  Tag as AntTag,
  Tooltip as AntTooltip,
  Typography as AntTypography,
} from 'antd'

function createAdapter(Component, displayName, mapProps = (props) => props) {
  const Adapter = forwardRef((props, ref) => <Component ref={ref} {...mapProps(props)} />)
  Adapter.displayName = displayName
  return Adapter
}

function disableAutocomplete(props) {
  return { ...props, autoComplete: 'off' }
}

function nonNegativeInputEvents({ onKeyDown, onBeforeInput, onPaste }) {
  return {
    onKeyDown: (event) => {
      if (['ArrowUp', 'ArrowDown', '-'].includes(event.key)) event.preventDefault()
      onKeyDown?.(event)
    },
    onBeforeInput: (event) => {
      if (event.data?.includes('-')) event.preventDefault()
      onBeforeInput?.(event)
    },
    onPaste: (event) => {
      if (event.clipboardData.getData('text').includes('-')) event.preventDefault()
      onPaste?.(event)
    },
  }
}

function configureInput(props) {
  const rest = disableAutocomplete(props)
  if (props.type !== 'number') return rest

  return {
    ...rest,
    min: Math.max(0, Number(props.min) || 0),
    ...nonNegativeInputEvents(props),
    onChange: (event) => {
      if (Number(event.target.value) < 0) event.target.value = '0'
      props.onChange?.(event)
    },
  }
}

function configureInputNumber(props) {
  return {
    ...props,
    min: Math.max(0, Number(props.min) || 0),
    controls: false,
    keyboard: false,
    ...nonNegativeInputEvents(props),
    onChange: (value) => {
      props.onChange?.(value != null && Number(value) < 0 ? (props.stringMode ? '0' : 0) : value)
    },
  }
}

export const App = createAdapter(AntApp, 'GlobalApp')
App.useApp = AntApp.useApp

function joinClassNames(...values) {
  return values.filter(Boolean).join(' ')
}

// Keep Ant Design-specific Button prop mapping and visual conventions in one adapter.
// When Ant Design changes its Button API, consumers remain unchanged and only this mapping needs updating.
export const Button = forwardRef(({
  variant,
  busy,
  isDanger,
  type,
  loading,
  danger,
  title,
  className,
  ...props
}, ref) => {
  const button = <AntButton
    ref={ref}
    {...props}
    aria-label={props['aria-label'] ?? (!props.children ? title : undefined)}
    className={joinClassNames('akura-button', className)}
    type={variant ?? type}
    loading={busy ?? loading}
    danger={isDanger ?? danger}
  />
  return title ? <AntTooltip title={title}>{button}</AntTooltip> : button
})
Button.displayName = 'GlobalButton'

export const Card = createAdapter(AntCard, 'GlobalCard', ({ bordered, variant, ...props }) => ({
  ...props,
  variant: variant ?? (bordered === undefined ? undefined : bordered ? 'outlined' : 'borderless'),
}))
export const Result = createAdapter(AntResult, 'GlobalResult')

export const Form = createAdapter(AntForm, 'GlobalForm', disableAutocomplete)
Form.Item = createAdapter(AntForm.Item, 'GlobalFormItem')
Form.List = createAdapter(AntForm.List, 'GlobalFormList')
Form.ErrorList = createAdapter(AntForm.ErrorList, 'GlobalFormErrorList')
Form.Provider = createAdapter(AntForm.Provider, 'GlobalFormProvider')
Form.useForm = AntForm.useForm
Form.useFormInstance = AntForm.useFormInstance
Form.useWatch = AntForm.useWatch

export const Input = createAdapter(AntInput, 'GlobalInput', configureInput)
Input.Search = createAdapter(AntInput.Search, 'GlobalSearchInput', disableAutocomplete)
Input.Password = createAdapter(AntInput.Password, 'GlobalPasswordInput', disableAutocomplete)
Input.TextArea = createAdapter(AntInput.TextArea, 'GlobalTextArea', disableAutocomplete)
export const InputNumber = createAdapter(AntInputNumber, 'GlobalInputNumber', configureInputNumber)

export const Modal = createAdapter(AntModal, 'GlobalModal', ({
  visible,
  busy,
  unmountOnClose,
  preRender,
  open,
  confirmLoading,
  destroyOnHidden,
  forceRender,
  ...props
}) => ({
  ...props,
  open: visible ?? open,
  confirmLoading: busy ?? confirmLoading,
  destroyOnHidden: unmountOnClose ?? destroyOnHidden,
  forceRender: preRender ?? forceRender,
}))

Modal.useModal = AntModal.useModal

export const Popconfirm = createAdapter(AntPopconfirm, 'GlobalPopconfirm')
export const Select = createAdapter(AntSelect, 'GlobalSelect')
export const Space = createAdapter(AntSpace, 'GlobalSpace')
export const Switch = createAdapter(AntSwitch, 'GlobalSwitch', ({ activeLabel, inactiveLabel, ...props }) => ({
  ...props,
  checkedChildren: activeLabel,
  unCheckedChildren: inactiveLabel,
}))
export const Table = createAdapter(AntTable, 'GlobalTable', ({ busy, loading, ...props }) => ({
  ...props,
  loading: busy ?? loading,
}))
export const Tabs = createAdapter(AntTabs, 'GlobalTabs', ({ initialKey, defaultActiveKey, ...props }) => ({
  ...props,
  defaultActiveKey: initialKey ?? defaultActiveKey,
}))
export const Tag = createAdapter(AntTag, 'GlobalTag')
export const Tooltip = createAdapter(AntTooltip, 'GlobalTooltip')
export const Typography = createAdapter(AntTypography, 'GlobalTypography')
Typography.Text = createAdapter(AntTypography.Text, 'GlobalTypographyText', ({ tone, type, ...props }) => ({
  ...props,
  type: tone ?? type,
}))
Typography.Title = createAdapter(AntTypography.Title, 'GlobalTypographyTitle')
