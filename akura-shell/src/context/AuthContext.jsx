import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // user disimpan di memory (React state), bukan localStorage/cookie
  const [user, setUser] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  // ─── Cek sesi aktif via /auth/me ────────────────────────────────────────────
  const checkSession = useCallback(async () => {
    setProfileLoading(true)
    try {
      const res = await authAPI.me()
      const userData = res.data?.data || null
      setUser(userData)
      return userData
    } catch {
      // 401 → sesi tidak aktif, user tetap null
      setUser(null)
      return null
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Jalankan saat app pertama dimuat
  useEffect(() => {
    checkSession()
  }, [checkSession])

  // ─── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    const res = await authAPI.login(credentials)
    const userData = res.data?.data?.user || null
    if (!userData) throw new Error('Respons login tidak memuat data pengguna.')
    setUser(userData)
    return { user: userData, message: res.data?.message }
  }, [])

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async (refreshToken) => {
    try {
      const res = await authAPI.logout(refreshToken)
      return res.data?.message
    } finally {
      setUser(null)
    }
  }, [])

  const updateProfile = useCallback(async (data) => {
    const res = await authAPI.updateProfile(data)
    const userData = res.data?.data
    if (!userData) throw new Error('Respons perubahan profil tidak memuat data pengguna.')
    setUser(userData)
    return { user: userData, message: res.data?.message }
  }, [])

  const changePassword = useCallback(async (data) => {
    const res = await authAPI.changePassword(data)
    const userData = res.data?.data
    if (userData) setUser(userData)
    return { user: userData, message: res.data?.message }
  }, [])

  const isAuthenticated = !!user && !profileLoading

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: profileLoading,
        profileLoading,
        isAuthenticated,
        login,
        logout,
        updateProfile,
        changePassword,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
