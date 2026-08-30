import { Form } from '../global'

/**
 * AppForm — Wrapper Ant Design Form
 * Default layout dan styling dikunci di sini sehingga konsisten di seluruh app.
 */
function AppForm({ children, layout = 'vertical', size = 'large', ...rest }) {
  return (
    <Form layout={layout} size={size} {...rest}>
      {children}
    </Form>
  )
}

/**
 * AppFormItem — Wrapper Ant Design Form.Item
 * Meneruskan semua props, memungkinkan default styling terpusat.
 */
function AppFormItem({ children, ...rest }) {
  return <Form.Item {...rest}>{children}</Form.Item>
}

AppForm.Item = AppFormItem
AppForm.useForm = Form.useForm
AppForm.useWatch = Form.useWatch
AppForm.Provider = Form.Provider

export { AppFormItem }
export default AppForm
