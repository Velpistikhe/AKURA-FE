import { useCallback, useEffect, useRef } from 'react'
import { Modal } from './AntdComponents'

export function useSaveConfirmation() {
  const [modal, contextHolder] = Modal.useModal()
  const pendingRef = useRef(null)

  useEffect(() => () => {
    const pending = pendingRef.current
    if (pending) {
      pending.finish(false)
      pending.dialog.destroy()
    }
  }, [])

  const confirmSave = useCallback((entity = 'data') => {
    // Ignore repeated Save clicks while a confirmation is already open.
    if (pendingRef.current) return Promise.resolve(false)
    return new Promise((resolve) => {
      const pending = {
        finish(confirmed) {
          if (pendingRef.current !== pending) return
          pendingRef.current = null
          resolve(confirmed)
        },
      }
      pendingRef.current = pending
      pending.dialog = modal.confirm({
        title: 'Confirm save',
        content: `Are you sure you want to save this ${entity}?`,
        okText: 'Save',
        cancelText: 'Cancel',
        focusable: { autoFocusButton: 'cancel' },
        onOk: () => pending.finish(true),
        onCancel: () => pending.finish(false),
        afterClose: () => pending.finish(false),
      })
    })
  }, [modal])

  return [confirmSave, contextHolder]
}
