import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from './AntdComponents'

export function useSaveConfirmation() {
  const [dialog, setDialog] = useState(null)
  const pendingRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    const pending = pendingRef.current
    pendingRef.current = null
    pending?.resolve(false)
  }, [])

  const complete = useCallback(() => {
    clearTimeout(timerRef.current)
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    setDialog(null)
    pending.resolve(pending.confirmed === true)
  }, [])

  const finish = useCallback((confirmed) => {
    const pending = pendingRef.current
    if (!pending || pending.closing) return
    pending.closing = true
    pending.confirmed = confirmed
    setDialog(current => ({ ...current, open: false }))
    // Allow the 180ms exit motion, but always remove the owned portal if a
    // browser animation event is lost. Save starts only after cleanup.
    timerRef.current = setTimeout(complete, 500)
  }, [complete])

  const confirmSave = useCallback((name = 'data') => {
    if (pendingRef.current) return Promise.resolve(false)
    return new Promise((resolve) => {
      pendingRef.current = { resolve }
      setDialog({ name, open: true })
    })
  }, [])

  const confirmation = dialog ? createElement(Modal, {
    open: dialog.open,
    className: 'akura-save-confirmation',
    title: 'Confirm save',
    okText: 'Save',
    cancelText: 'Cancel',
    mask: { closable: false },
    focusable: { autoFocusButton: 'cancel' },
    destroyOnHidden: true,
    onOk: () => finish(true),
    onCancel: () => finish(false),
    afterClose: complete,
  }, 'Are you sure you want to save this ' + dialog.name + '?') : null

  return [confirmSave, confirmation]
}
