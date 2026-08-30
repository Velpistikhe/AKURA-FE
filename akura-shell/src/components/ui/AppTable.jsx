import { DatabaseOutlined, Empty, Table } from '../global'
import './AppTable.css'

/**
 * AppTable — Wrapper Ant Design Table
 *
 * Default:
 * - Custom empty state bermerek Akura
 * - Sticky header
 * - Zebra row (opsional via zebraRows prop)
 *
 * @param {boolean} zebraRows  — alternating row background
 * @param {string}  emptyText  — pesan saat data kosong
 */
function AppTable({
  zebraRows = false,
  emptyText = 'Belum ada data',
  className = '',
  locale,
  ...rest
}) {
  const emptyState = (
    <Empty
      image={
        <div className="app-table-empty-icon">
          <DatabaseOutlined />
        </div>
      }
      description={
        <span style={{ color: '#8a9ab8', fontSize: 14, fontWeight: 500 }}>
          {emptyText}
        </span>
      }
    />
  )

  return (
    <Table
      className={`app-table ${zebraRows ? 'app-table--zebra' : ''} ${className}`}
      locale={{ emptyText: emptyState, ...locale }}
      {...rest}
    />
  )
}

export default AppTable
