import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe } from '../api/usuario.api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Cargar usuario desde el token almacenado al iniciar la app
  useEffect(() => {
    const token = localStorage.getItem('jwt')
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then((res) => {
        const userData = res.data?.usuario || res.data
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      })
      .catch(() => {
        localStorage.removeItem('jwt')
        localStorage.removeItem('user')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((token, userData) => {
    localStorage.setItem('jwt', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('jwt')
    if (!token) {
      setUser(null)
      return
    }
    try {
      const res = await getMe()
      const userData = res.data?.usuario || res.data
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
    } catch (error) {
      console.error('Error al refrescar usuario:', error)
      localStorage.removeItem('jwt')
      localStorage.removeItem('user')
      setUser(null)
    }
  }, [])

  const isAdmin = user?.id_rol === 1 || user?.rol === 1
  const isVendedor = user?.id_rol === 2 || user?.rol === 2
  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser, isAdmin, isVendedor, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
