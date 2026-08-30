import { createContext, useContext, useCallback } from 'react'
import {
  notification,
  message,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  BellOutlined,
} from '../components/global'

// ─── Global notification config ──────────────────────────────────────────────
notification.config({
  placement: 'topRight',
  duration: 4,
  maxCount: 5,
})

message.config({
  duration: 3,
  maxCount: 3,
})

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICONS = {
  success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  error:   <CloseCircleOutlined style={{ color: '#e02020' }} />,
  warning: <WarningOutlined     style={{ color: '#faad14' }} />,
  info:    <InfoCircleOutlined  style={{ color: '#1890ff' }} />,
  default: <BellOutlined        style={{ color: '#1a2e5e' }} />,
}

// ─── Context ──────────────────────────────────────────────────────────────────
const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [api, contextHolder] = notification.useNotification()
  const [msgApi, msgContextHolder] = message.useMessage()

  /**
   * Tampilkan notifikasi panel (kanan atas)
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} title     — judul notifikasi
   * @param {string} desc      — deskripsi (opsional)
   * @param {object} options   — override notification options
   */
  const notify = useCallback(
    (type, title, desc, options = {}) => {
      api.open({
        type,
        // antd v6: 'message' → 'title'
        title: (
          <span style={{ fontWeight: 700, color: '#1a2e5e', fontSize: 14 }}>
            {title}
          </span>
        ),
        description: desc ? (
          <span style={{ color: '#5a6a8a', fontSize: 13 }}>{desc}</span>
        ) : undefined,
        icon: ICONS[type] || ICONS.default,
        style: {
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(26, 46, 94, 0.15)',
          border: '1px solid rgba(26, 46, 94, 0.07)',
        },
        ...options,
      })
    },
    [api]
  )

  /**
   * Toast pesan singkat (tengah atas)
   */
  const toast = useCallback(
    (type, content, duration) => {
      msgApi[type]?.(content, duration)
    },
    [msgApi]
  )

  // ─── Shorthand API ───────────────────────────────────────────────────────────
  const notifier = {
    /** Notifikasi panel */
    success: (title, desc, opts) => notify('success', title, desc, opts),
    error:   (title, desc, opts) => notify('error',   title, desc, opts),
    warning: (title, desc, opts) => notify('warning', title, desc, opts),
    info:    (title, desc, opts) => notify('info',    title, desc, opts),
    open:    (opts)              => api.open(opts),
    destroy: ()                  => api.destroy(),

    /** Toast singkat */
    toast: {
      success: (msg, dur) => toast('success', msg, dur),
      error:   (msg, dur) => toast('error',   msg, dur),
      warning: (msg, dur) => toast('warning', msg, dur),
      info:    (msg, dur) => toast('info',    msg, dur),
      loading: (msg, dur) => toast('loading', msg, dur),
    },
  }

  return (
    <NotificationContext.Provider value={notifier}>
      {contextHolder}
      {msgContextHolder}
      {children}
    </NotificationContext.Provider>
  )
}

/**
 * useNotification — hook untuk mengakses notifier dari komponen manapun
 *
 * Contoh:
 *   const notify = useNotification()
 *   notify.success('Berhasil!', 'Data telah disimpan.')
 *   notify.toast.error('Gagal memuat data')
 */
export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used inside NotificationProvider')
  return ctx
}

export default NotificationContext
