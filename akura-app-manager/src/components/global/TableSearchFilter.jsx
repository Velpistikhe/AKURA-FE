import { Button, Input, Space } from './AntdComponents'

function TableSearchFilter({
  selectedKeys,
  setSelectedKeys,
  confirm,
  clearFilters,
  onSearch,
  placeholder = 'Search data',
}) {
  const apply = () => {
    onSearch(selectedKeys[0] || '')
    confirm()
  }

  const reset = () => {
    clearFilters?.()
    setSelectedKeys([])
    onSearch('')
    confirm()
  }

  return (
    <div className="table-filter-dropdown" onKeyDown={(event) => event.stopPropagation()}>
      <Input
        autoFocus
        allowClear
        maxLength={100}
        placeholder={placeholder}
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
