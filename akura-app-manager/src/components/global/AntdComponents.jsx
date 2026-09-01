import { forwardRef } from 'react'
import {
  App as AntApp,
  Button as AntButton,
  Card as AntCard,
  Col as AntCol,
  Form as AntForm,
  Input as AntInput,
  InputNumber as AntInputNumber,
  Modal as AntModal,
  Popconfirm as AntPopconfirm,
  Row as AntRow,
  Select as AntSelect,
  Space as AntSpace,
  Statistic as AntStatistic,
  Switch as AntSwitch,
  Table as AntTable,
  Tabs as AntTabs,
  Tag as AntTag,
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

function preventNumberArrowKeys(event) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') event.preventDefault()
}

function configureInput(props) {
  const { onKeyDown, ...rest } = disableAutocomplete(props)
  if (props.type !== 'number') return { ...rest, onKeyDown }

  return {
    ...rest,
    onKeyDown: (event) => {
      preventNumberArrowKeys(event)
      onKeyDown?.(event)
    },
  }
}

function configureInputNumber({ onKeyDown, ...props }) {
  return {
    ...props,
    controls: false,
    keyboard: false,
    onKeyDown: (event) => {
      preventNumberArrowKeys(event)
      onKeyDown?.(event)
    },
  }
}

// Props di sebelah kiri adalah kontrak aplikasi. Nama atribut Ant Design hanya
// digunakan di sebelah kanan sehingga perubahan versi cukup diperbaiki di sini.
export const App = createAdapter(AntApp, 'GlobalApp')
App.useApp = AntApp.useApp
export const Button = createAdapter(AntButton, 'GlobalButton', ({
  variant,
  busy,
  isDanger,
  type,
  loading,
  danger,
  ...props
}) => ({
  ...props,
  type: variant ?? type,
  loading: busy ?? loading,
  danger: isDanger ?? danger,
}))
export const Card = createAdapter(AntCard, 'GlobalCard', ({ bordered, variant, ...props }) => ({
  ...props,
  variant: variant ?? (bordered === undefined ? undefined : bordered ? 'outlined' : 'borderless'),
}))
export const Col = createAdapter(AntCol, 'GlobalCol')
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
  open,
  confirmLoading,
  destroyOnHidden,
  preRender,
  forceRender,
  ...props
}) => ({
  ...props,
  open: visible ?? open,
  confirmLoading: busy ?? confirmLoading,
  destroyOnHidden: unmountOnClose ?? destroyOnHidden,
  forceRender: preRender ?? forceRender,
}))
Modal.confirm = AntModal.confirm
Modal.info = AntModal.info
Modal.success = AntModal.success
Modal.error = AntModal.error
Modal.warning = AntModal.warning
Modal.destroyAll = AntModal.destroyAll
Modal.useModal = AntModal.useModal
export const Popconfirm = createAdapter(AntPopconfirm, 'GlobalPopconfirm')
export const Row = createAdapter(AntRow, 'GlobalRow')
export const Select = createAdapter(AntSelect, 'GlobalSelect')
export const Space = createAdapter(AntSpace, 'GlobalSpace')
export const Statistic = createAdapter(AntStatistic, 'GlobalStatistic')
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
export const Typography = createAdapter(AntTypography, 'GlobalTypography')
Typography.Text = createAdapter(AntTypography.Text, 'GlobalTypographyText', ({ tone, type, ...props }) => ({
  ...props,
  type: tone ?? type,
}))
Typography.Title = createAdapter(AntTypography.Title, 'GlobalTypographyTitle')
