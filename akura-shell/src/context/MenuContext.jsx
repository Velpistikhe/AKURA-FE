import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { menuAPI } from '../services/menuApi'

const MenuContext = createContext(null)

export function MenuProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [menus, setMenus] = useState(null)
  const [status, setStatus] = useState('idle')

  const loadMenus = useCallback(async (signal) => {
    setStatus('loading')

    try {
      const response = await menuAPI.myMenus({ signal })
      const menuData = Array.isArray(response.data?.data) ? response.data.data : []
      setMenus(menuData)
      setStatus('success')
      return menuData
    } catch {
      if (signal?.aborted) return null

      setMenus([])
      setStatus('error')
      return null
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setMenus(null)
      setStatus('idle')
      return undefined
    }

    const controller = new AbortController()
    loadMenus(controller.signal)

    return () => controller.abort()
  }, [isAuthenticated, user?.id, loadMenus])

  const menuLoading = isAuthenticated && (status === 'idle' || status === 'loading')
  const menuError = status === 'error'

  return (
    <MenuContext.Provider
      value={{ menus, menuLoading, menuError, loadMenus }}
    >
      {children}
    </MenuContext.Provider>
  )
}

export function useMenu() {
  const context = useContext(MenuContext)
  if (!context) throw new Error('useMenu must be used within MenuProvider')
  return context
}

export default MenuContext
