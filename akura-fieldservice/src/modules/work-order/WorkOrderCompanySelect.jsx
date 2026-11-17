import { useEffect, useState } from 'react'
import { Button, Select } from '../../components/global'
import { workOrderService } from '../../services/workOrderService'

export default function WorkOrderCompanySelect({ value, onChange, disabled }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [companies, setCompanies] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      workOrderService.companies({ search: search.trim(), page }).then(({ data }) => {
        if (!active) return
        if (!Array.isArray(data?.companies) || !data.pagination) throw new Error('Invalid company options response.')
        const rows = data.companies.filter((company) => !company.revoked)
        setCompanies((current) => page === 1 ? rows : [...current, ...rows])
        setTotalPages(data.pagination.totalPages)
      }).catch((err) => { if (active) setError(err.message) })
        .finally(() => { if (active) setLoading(false) })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [search, page, retry])
  const options = [...new Map([...(value ? [value] : []), ...companies].map((company) => [company.id, company])).values()]
  return <>
    <Select aria-label="Company" showSearch filterOption={false} value={value?.id} disabled={disabled} loading={loading}
      placeholder="Search company name" options={options.map((company) => ({ value: company.id, label: company.name }))}
      onSearch={(text) => { setSearch(text.slice(0, 100)); setPage(1); setCompanies([]) }}
      onChange={(id) => onChange(options.find((company) => company.id === id))}
      onPopupScroll={(event) => {
        const target = event.target
        if (!loading && !error && page < totalPages && target.scrollTop + target.clientHeight >= target.scrollHeight - 24) setPage((current) => current + 1)
      }} />
    {error && <div role="alert">{error} <Button onClick={() => setRetry((current) => current + 1)}>Retry companies</Button></div>}
  </>
}
