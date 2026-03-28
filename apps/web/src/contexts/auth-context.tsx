import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { mockUser } from '@/data/mock'
import type { User } from '@/types'

const STORAGE_SESSION = 'readme-gen-session'
const STORAGE_GUEST = 'readme-gen-guest'

type AuthContextValue = {
  user: User | null
  isGuest: boolean
  isAuthenticated: boolean
  login: (email: string, _password: string) => void
  register: (email: string, _password: string) => void
  logout: () => void
  enterGuest: () => void
  updateUser: (patch: Partial<User>) => void
  setApiKeys: (keys: User['apiKeys']) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function saveSession(user: User | null) {
  if (!user) localStorage.removeItem(STORAGE_SESSION)
  else localStorage.setItem(STORAGE_SESSION, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadSession())
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem(STORAGE_GUEST) === '1')

  const login = useCallback((email: string) => {
    const next: User = {
      ...mockUser,
      email,
    }
    setUser(next)
    setIsGuest(false)
    saveSession(next)
    localStorage.removeItem(STORAGE_GUEST)
  }, [])

  const register = useCallback((email: string) => {
    const next: User = {
      ...mockUser,
      email,
      plan: 'free',
      usage: { generationsUsed: 0, generationsLimit: 5 },
    }
    setUser(next)
    setIsGuest(false)
    saveSession(next)
    localStorage.removeItem(STORAGE_GUEST)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setIsGuest(false)
    saveSession(null)
    localStorage.removeItem(STORAGE_GUEST)
  }, [])

  const enterGuest = useCallback(() => {
    setUser(null)
    setIsGuest(true)
    saveSession(null)
    localStorage.setItem(STORAGE_GUEST, '1')
  }, [])

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      saveSession(next)
      return next
    })
  }, [])

  const setApiKeys = useCallback((keys: User['apiKeys']) => {
    updateUser({ apiKeys: keys })
  }, [updateUser])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest,
      isAuthenticated: Boolean(user) || isGuest,
      login,
      register,
      logout,
      enterGuest,
      updateUser,
      setApiKeys,
    }),
    [user, isGuest, login, register, logout, enterGuest, updateUser, setApiKeys],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
