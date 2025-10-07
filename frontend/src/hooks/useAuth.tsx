import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { authService } from '../services/authService'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken()
      const savedUser = authService.getUser()

      if (token && savedUser) {
        setUser(savedUser)

        try {
          // Verify token is still valid
          const profile = await authService.getProfile()
          setUser(profile)
          authService.saveUser(profile)
        } catch (error) {
          // Token expired or invalid
          authService.logout()
          setUser(null)
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const { token, user: authenticatedUser } = await authService.login({ username, password })
      authService.saveToken(token)
      authService.saveUser(authenticatedUser)
      setUser(authenticatedUser)
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }

  const register = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const { token, user: registeredUser } = await authService.register({ username, password })
      authService.saveToken(token)
      authService.saveUser(registeredUser)
      setUser(registeredUser)
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      throw error
    }
  }

  const logout = () => {
    setIsLoading(true)
    authService.logout()
    setUser(null)
    setIsLoading(false)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}