import { forwardRef } from 'react'
import {
  Alert as AntAlert,
  Avatar as AntAvatar,
  Badge as AntBadge,
  Breadcrumb as AntBreadcrumb,
  Button as AntButton,
  Card as AntCard,
  Checkbox as AntCheckbox,
  Col as AntCol,
  ConfigProvider as AntConfigProvider,
  Divider as AntDivider,
  Dropdown as AntDropdown,
  Empty as AntEmpty,
  Form as AntForm,
  Input as AntInput,
  Layout as AntLayout,
  Menu as AntMenu,
  Modal as AntModal,
  Progress as AntProgress,
  Row as AntRow,
  Spin as AntSpin,
  Statistic as AntStatistic,
  Table as AntTable,
  Tag as AntTag,
  Tooltip as AntTooltip,
} from 'antd'

function createAdapter(Component, displayName, mapProps = (props) => props) {
  const Adapter = forwardRef((props, ref) => <Component ref={ref} {...mapProps(props)} />)
  Adapter.displayName = displayName
  return Adapter
}

function disableAutocomplete(props) {
  return { ...props, autoComplete: 'off' }
}

// Kontrak props aplikasi berada di sisi kiri. Jika Ant Design mengubah atau
// menghapus atribut, hanya mapping pada file ini yang perlu disesuaikan.
export const Alert = createAdapter(AntAlert, 'GlobalAlert', ({ tone, type, ...props }) => ({
  ...props,
  type: tone ?? type,
}))
export const Avatar = createAdapter(AntAvatar, 'GlobalAvatar')
export const Badge = createAdapter(AntBadge, 'GlobalBadge')
export const Breadcrumb = createAdapter(AntBreadcrumb, 'GlobalBreadcrumb')
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
export const Checkbox = createAdapter(AntCheckbox, 'GlobalCheckbox')
Checkbox.Group = createAdapter(AntCheckbox.Group, 'GlobalCheckboxGroup')
export const Col = createAdapter(AntCol, 'GlobalCol')
export const ConfigProvider = createAdapter(AntConfigProvider, 'GlobalConfigProvider')
ConfigProvider.useConfig = AntConfigProvider.useConfig
export const Divider = createAdapter(AntDivider, 'GlobalDivider')
export const Dropdown = createAdapter(AntDropdown, 'GlobalDropdown')
export const Empty = createAdapter(AntEmpty, 'GlobalEmpty')
export const Form = createAdapter(AntForm, 'GlobalForm', disableAutocomplete)
Form.Item = createAdapter(AntForm.Item, 'GlobalFormItem')
Form.List = createAdapter(AntForm.List, 'GlobalFormList')
Form.ErrorList = createAdapter(AntForm.ErrorList, 'GlobalFormErrorList')
Form.Provider = createAdapter(AntForm.Provider, 'GlobalFormProvider')
Form.useForm = AntForm.useForm
Form.useFormInstance = AntForm.useFormInstance
Form.useWatch = AntForm.useWatch
export const Input = createAdapter(AntInput, 'GlobalInput', disableAutocomplete)
Input.Search = createAdapter(AntInput.Search, 'GlobalSearchInput', disableAutocomplete)
Input.Password = createAdapter(AntInput.Password, 'GlobalPasswordInput', disableAutocomplete)
Input.TextArea = createAdapter(AntInput.TextArea, 'GlobalTextArea', disableAutocomplete)
export const Layout = createAdapter(AntLayout, 'GlobalLayout')
Layout.Header = createAdapter(AntLayout.Header, 'GlobalLayoutHeader')
Layout.Content = createAdapter(AntLayout.Content, 'GlobalLayoutContent')
Layout.Footer = createAdapter(AntLayout.Footer, 'GlobalLayoutFooter')
Layout.Sider = createAdapter(AntLayout.Sider, 'GlobalLayoutSider')
export const Menu = createAdapter(AntMenu, 'GlobalMenu')
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
export const Progress = createAdapter(AntProgress, 'GlobalProgress', ({
  trackColor,
  trailColor,
  railColor,
  ...props
}) => ({
  ...props,
  railColor: trackColor ?? railColor ?? trailColor,
}))
export const Row = createAdapter(AntRow, 'GlobalRow')
export const Spin = createAdapter(AntSpin, 'GlobalSpin')
export const Statistic = createAdapter(AntStatistic, 'GlobalStatistic', ({
  contentStyle,
  valueStyle,
  styles,
  ...props
}) => ({
  ...props,
  styles: {
    ...styles,
    content: contentStyle ?? styles?.content ?? valueStyle,
  },
}))
export const Table = createAdapter(AntTable, 'GlobalTable', ({ busy, loading, ...props }) => ({
  ...props,
  loading: busy ?? loading,
}))
export const Tag = createAdapter(AntTag, 'GlobalTag')
export const Tooltip = createAdapter(AntTooltip, 'GlobalTooltip')
