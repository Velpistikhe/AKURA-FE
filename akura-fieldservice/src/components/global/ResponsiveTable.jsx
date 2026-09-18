import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Table as AntTable } from 'antd'
import './ResponsiveTable.css'

const isAction = (column) => /^(action|actions)$/i.test(String(column.key || ''))
  || (typeof column.title === 'string' && /^(action|actions)$/i.test(column.title.trim()))

export const Table = forwardRef(({ columns, busy, loading, ...props }, ref) => {
  const container = useRef(null)
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  const [widths, setWidths] = useState({})

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  // Measure intrinsic content, including conditional buttons and localized labels.
  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const measure = () => {
      const next = {}
      root.querySelectorAll('[data-action-column]').forEach((node) => {
        if (node.closest('.akura-responsive-table') !== root) return
        const cell = node.closest('td, th')
        if (!cell) return
        const style = getComputedStyle(cell)
        const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
        const key = node.dataset.actionColumn
        next[key] = Math.max(next[key] || 0, Math.ceil(node.getBoundingClientRect().width + padding + 2))
      })
      setWidths((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    root.querySelectorAll('[data-action-column]').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  })

  const adapt = (entries, parent = '') => entries?.map((column, index) => {
    const key = parent + index
    if (column.children) return { ...column, children: adapt(column.children, key + '-') }
    if (!isAction(column)) return { ...column }
    return {
      ...column,
      align: 'center',
      fixed: compact ? false : column.fixed,
      width: widths[key] || 80,
      minWidth: widths[key] || 80,
      className: [column.className, 'akura-actions-cell'].filter(Boolean).join(' '),
      title: <span className="akura-actions-content" data-action-column={key}>{column.title}</span>,
      render: (value, record, rowIndex) => <span className="akura-actions-content" data-action-column={key}>
        {column.render ? column.render(value, record, rowIndex) : value}
      </span>,
    }
  })

  const adaptedColumns = adapt(columns)
  const leaves = (entries) => entries?.flatMap(column => column.children ? leaves(column.children) : [column]) || []
  const leafColumns = leaves(adaptedColumns)
  // A flexible data column absorbs surplus space instead of stretching Actions.
  if (leafColumns.some(column => column.className?.includes('akura-actions-cell'))
    && leafColumns.every(column => column.width != null)) {
    const flexible = [...leafColumns].reverse().find(column => !column.className?.includes('akura-actions-cell') && !column.fixed)
    if (flexible) {
      flexible.minWidth = flexible.minWidth ?? flexible.width
      delete flexible.width
    }
  }

  return <div ref={container} className="akura-responsive-table">
    <AntTable {...props} ref={ref} columns={adaptedColumns} loading={busy ?? loading} />
  </div>
})
Table.displayName = 'GlobalTable'
