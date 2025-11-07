'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { User, LoginRequest, RegisterRequest } from '@/types'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    
    setIsLoading(false)
  }, [])

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => apiClient.login(data.email, data.password),
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { user, token } = response.data
        setUser(user)
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        toast.success('Inicio de sesión exitoso')
        router.push('/dashboard')
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Error al iniciar sesión'
      toast.error(message)
    }
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => apiClient.register(data),
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Usuario registrado exitosamente')
        router.push('/login')
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Error al registrar usuario'
      toast.error(message)
    }
  })

  // Logout function
  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    queryClient.clear()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  const value: AuthContextType = {
    user,
    isLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
