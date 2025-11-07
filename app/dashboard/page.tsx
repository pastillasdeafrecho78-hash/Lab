'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ChartBarIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Usuario {
  id: string
  email: string
  nombre: string
  apellido: string
  rol: string
  sucursales: Array<{
    id: string
    nombre: string
  }>
}

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }

    fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setUsuario(data.data)
      } else {
        toast.error('Error al cargar usuario')
        router.push('/')
      }
    })
    .catch(() => {
      toast.error('Error de conexión')
      router.push('/')
    })
    .finally(() => setLoading(false))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    toast.success('Sesión cerrada')
    router.push('/')
  }

  const menuItems = [
    {
      title: 'Comandas',
      description: 'Gestionar comandas y resultados',
      icon: ClipboardDocumentListIcon,
      href: '/dashboard/comandas',
      color: 'bg-primary-500'
    },
    {
      title: 'Sucursales',
      description: 'Administrar sucursales',
      icon: BuildingOfficeIcon,
      href: '/dashboard/sucursales',
      color: 'bg-success-500'
    },
    {
      title: 'Maquinaria',
      description: 'Gestionar equipos de laboratorio',
      icon: CpuChipIcon,
      href: '/dashboard/maquinaria',
      color: 'bg-warning-500'
    },
    {
      title: 'Chat',
      description: 'Comunicación interna',
      icon: ChatBubbleLeftRightIcon,
      href: '/dashboard/chat',
      color: 'bg-secondary-500'
    },
    {
      title: 'Clientes',
      description: 'Gestionar clientes',
      icon: UserIcon,
      href: '/dashboard/clientes',
      color: 'bg-purple-500'
    },
    {
      title: 'Usuarios',
      description: 'Administrar personal',
      icon: UserGroupIcon,
      href: '/dashboard/usuarios',
      color: 'bg-danger-500'
    },
    {
      title: 'Reportes',
      description: 'Estadísticas y reportes',
      icon: ChartBarIcon,
      href: '/dashboard/reportes',
      color: 'bg-indigo-500'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!usuario) {
    return null
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-secondary-900">Laboratorio Comandas</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-secondary-900">
                  {usuario.nombre} {usuario.apellido}
                </p>
                <p className="text-xs text-secondary-500 capitalize">
                  {usuario.rol.replace('_', ' ').toLowerCase()}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">
            Bienvenido, {usuario.nombre}
          </h2>
          <p className="text-secondary-600">
            Gestiona tu laboratorio desde el panel de control
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <ClipboardDocumentListIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Comandas Hoy</p>
                <p className="text-2xl font-bold text-secondary-900">12</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-success-100 rounded-lg">
                <BuildingOfficeIcon className="h-6 w-6 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Sucursales</p>
                <p className="text-2xl font-bold text-secondary-900">{usuario.sucursales.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-warning-100 rounded-lg">
                <CpuChipIcon className="h-6 w-6 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Equipos Activos</p>
                <p className="text-2xl font-bold text-secondary-900">8</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-danger-100 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-danger-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Mensajes</p>
                <p className="text-2xl font-bold text-secondary-900">3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onClick={() => router.push(item.href)}
              >
                <div className="flex items-start">
                  <div className={`p-3 ${item.color} rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-secondary-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
