import { Button, Input, Space } from './AntdComponents'

function TableSearchFilter({ selectedKeys, setSelectedKeys, confirm, clearFilters, onSearch, placeholder = 'Search name or address', maxLength = 100 }) {
  const apply = () => {
    onSearch?.((selectedKeys[0] || '').trim())
    confirm()
  }

  const reset = () => {
    clearFilters?.()
    setSelectedKeys([])
    onSearch?.('')
    confirm()
  }

  return (
    <div className="table-filter-dropdown" style={{ padding: 8 }} onKeyDown={(event) => event.stopPropagation()}>
      <Input
        autoFocus
        allowClear
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={placeholder}
        value={selectedKeys[0] || ''}
        onChange={(event) => setSelectedKeys(event.target.value ? [event.target.value] : [])}
        onPressEnter={apply}
      />
      <Space>
        <Button size="small" variant="primary" onClick={apply}>Apply</Button>
        <Button size="small" onClick={reset}>Reset</Button>
      </Space>
    </div>
  )
}

export default TableSearchFilter
