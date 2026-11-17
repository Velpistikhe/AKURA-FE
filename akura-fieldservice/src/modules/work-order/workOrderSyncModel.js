import { workOrderService } from '../../services/workOrderService'

// Poll only queued deliveries, sequentially. Cleanup cancels both the request
// and the next refresh when the modal, page or authenticated branch changes.
export function watchWorkOrderSync(id, query, { onData, onError }) {
  const controller = new AbortController()
  let timer
  const load = async () => {
    try {
      const response = await workOrderService.sync(id, query, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (!Array.isArray(response?.data) || !Number.isInteger(response?.pagination?.total)) {
        throw new Error('Invalid work order synchronisation response.')
      }
      onData(response)
      if (response.data.some((row) => ['PENDING', 'RETRYING'].includes(row.delivery?.deliveryStatus))) {
        timer = setTimeout(load, 5000)
      }
    } catch (error) {
      if (!controller.signal.aborted) onError(error)
    }
  }
  load()
  return () => { controller.abort(); clearTimeout(timer) }
}
