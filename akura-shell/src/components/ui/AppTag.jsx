import {
  Tag,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
} from '../global'

/**
 * AppTag — Wrapper Ant Design Tag
 *
 * @param {'success'|'error'|'warning'|'info'|'default'|'inactive'|string} status
 *   Preset status otomatis menambahkan icon + warna yang sesuai brand.
 *   Jika bukan salah satu preset, diteruskan langsung ke color prop.
 * @param {boolean} showIcon — tampilkan icon preset (default true untuk status preset)
 */

const STATUS_MAP = {
  success:  { color: 'success',  icon: <CheckCircleOutlined />,  label: 'Successful' },
  error:    { color: 'error',    icon: <CloseCircleOutlined />,   label: 'Failed' },
  warning:  { color: 'warning',  icon: <WarningOutlined />,       label: 'Warning' },
  info:     { color: 'processing', icon: <InfoCircleOutlined />,  label: 'Info' },
  pending:  { color: 'default',  icon: <ClockCircleOutlined />,   label: 'Pending' },
  inactive: { color: 'default',  icon: <MinusCircleOutlined />,   label: 'Inactive' },
  active:   { color: 'success',  icon: <CheckCircleOutlined />,   label: 'Active' },
}

function AppTag({ status, showIcon = true, children, color, ...rest }) {
  const preset = STATUS_MAP[status]

  if (preset) {
    return (
      <Tag
        color={preset.color}
        icon={showIcon ? preset.icon : undefined}
        style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}
        {...rest}
      >
        {children ?? preset.label}
      </Tag>
    )
  }

  return (
    <Tag
      color={color || status}
      style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default AppTag
