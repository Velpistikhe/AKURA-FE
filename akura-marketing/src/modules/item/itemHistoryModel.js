// The size endpoint also returns price audits. Filter all pages before pagination
// so price-only pages do not leave gaps or inflate the visible history count.
export async function loadSizeHistory(id, readHistory, isCurrent = () => true) {
  const history = []
  let page = 1
  let totalPages = 1
  do {
    const { data } = await readHistory(id, { page, limit: 100 })
    if (!isCurrent()) return null
    history.push(...data.history.filter((entry) => entry.entityType === 'ITEM_SIZE'
      && entry.entityId === id && !['PRICE_UPDATE', 'CHILD_UPDATE'].includes(entry.action)))
    totalPages = data.pagination.totalPages
    page++
  } while (page <= totalPages)
  return { history, pagination: { total: history.length } }
}
