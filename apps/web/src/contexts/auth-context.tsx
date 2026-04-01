import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { User } from '@/types'

const STORAGE_TOKEN = 'readme-gen-token'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

type AuthContextValue = {
  user: User | null
  token: string | null
  isLoading: boolean
  isGuest: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName?: string) => Promise<void>
  loginWithGoogle: () => void
  loginWithGithub: () => void
  logout: () => void
  enterGuest: () => void
  updateUser: (patch: Partial<User>) => void
  setToken: (token: string) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(STORAGE_TOKEN))
  const [isLoading, setIsLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('readme-gen-guest') === '1')

  const setToken = useCallback((newToken: string | null) => {
    setTokenState(newToken)
    if (newToken) {
      localStorage.setItem(STORAGE_TOKEN, newToken)
    } else {
      localStorage.removeItem(STORAGE_TOKEN)
    }
  }, [])

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        setToken(null)
      }
    } catch {
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [setToken])

  // Initial check
  useMemo(() => {
    if (token) {
      fetchUser(token)
    } else {
      setIsLoading(false)
    }
  }, [token, fetchUser])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    setToken(data.token)
    setUser(data.user)
    setIsGuest(false)
    localStorage.removeItem('readme-gen-guest')
  }, [setToken])

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    setToken(data.token)
    setUser(data.user)
    setIsGuest(false)
    localStorage.removeItem('readme-gen-guest')
  }, [setToken])

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API_URL}/auth/google`
  }, [])

  const loginWithGithub = useCallback(() => {
    window.location.href = `${API_URL}/auth/github`
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    setIsGuest(false)
    localStorage.removeItem('readme-gen-guest')
  }, [setToken])

  const enterGuest = useCallback(() => {
    setUser(null)
    setToken(null)
    setIsGuest(true)
    localStorage.setItem('readme-gen-guest', '1')
  }, [setToken])

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : null))
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return
    await fetchUser(token)
  }, [fetchUser, token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isGuest,
      isAuthenticated: Boolean(user) || isGuest,
      login,
      register,
      loginWithGoogle,
      loginWithGithub,
      logout,
      enterGuest,
      updateUser,
      setToken,
      refreshUser,
    }),
    [user, token, isLoading, isGuest, login, register, loginWithGoogle, loginWithGithub, logout, enterGuest, updateUser, setToken, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
