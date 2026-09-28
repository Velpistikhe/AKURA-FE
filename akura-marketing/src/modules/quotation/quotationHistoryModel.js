export async function loadQuotationHistory(id, query, readHistory, isCurrent = () => true) {
  const { page, limit, action, sortBy, sortOrder, versionFilter = '', dateFilter = '', nameFilter = '' } = query
  const params = { page, limit, action, sortBy, sortOrder }
  if (!versionFilter && !dateFilter && !nameFilter) return (await readHistory(id, params)).data
  const history = []
  let nextPage = 1
  let totalPages = 1
  do {
    const { data } = await readHistory(id, { ...params, page: nextPage, limit: 100 })
    if (!isCurrent()) return null
    history.push(...data.history.filter((row) => {
      const date = row.createdAt ? `${row.createdAt} ${new Date(row.createdAt).toLocaleString()}` : '-'
      const name = row.createdByName || row.createdBy?.name || '-'
      return (!versionFilter || String(row.version) === versionFilter)
        && (!dateFilter || date.toLowerCase().includes(dateFilter.toLowerCase()))
        && (!nameFilter || name.toLowerCase().includes(nameFilter.toLowerCase()))
    }))
    totalPages = data.pagination?.totalPages || 1
    nextPage++
  } while (nextPage <= totalPages)
  return { history: history.slice((page - 1) * limit, page * limit), pagination: { total: history.length, totalPages: Math.ceil(history.length / limit) } }
}
