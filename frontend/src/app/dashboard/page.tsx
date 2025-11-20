'use client'

import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { 
  Users, 
  Building2, 
  Activity, 
  FileText, 
  MessageSquare, 
  Settings,
  LogOut,
  Bell,
  Search
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch dashboard data
  const { data: comandasData } = useQuery({
    queryKey: ['comandas', 'dashboard'],
    queryFn: () => apiClient.getComandas(1, 5),
    enabled: !!user
  })

  const { data: sucursalesData } = useQuery({
    queryKey: ['sucursales', 'dashboard'],
    queryFn: () => apiClient.getSucursales(1, 10),
    enabled: !!user
  })

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'dashboard'],
    queryFn: () => apiClient.getClientes(1, 5),
    enabled: !!user
  })

  const stats = [
    {
      name: 'Comandas Pendientes',
      value: comandasData?.data?.filter((c: any) => c.estado === 'PENDIENTE').length || 0,
      icon: FileText,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      name: 'Comandas Completadas',
      value: comandasData?.data?.filter((c: any) => c.estado === 'COMPLETADA').length || 0,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Total Sucursales',
      value: sucursalesData?.pagination?.total || 0,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Total Clientes',
      value: clientesData?.pagination?.total || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  const navigation = [
    { name: 'Comandas', href: '/comandas', icon: FileText },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Sucursales', href: '/sucursales', icon: Building2 },
    { name: 'Maquinaria', href: '/maquinaria', icon: Activity },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Configuración', href: '/configuracion', icon: Settings },
  ]

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Laboratorio Comandas
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Bell className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.nombre} {user.apellido}
                  </p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-md ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 rounded-md bg-primary/10">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Gestionar {item.name.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Comandas */}
        {comandasData?.data && comandasData.data.length > 0 && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Comandas Recientes
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {comandasData.data.slice(0, 5).map((comanda: any) => (
                  <div key={comanda.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {comanda.numeroComanda}
                        </p>
                        <p className="text-sm text-gray-500">
                          {comanda.tipoPrueba}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          comanda.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                          comanda.estado === 'COMPLETADA' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {comanda.estado}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 bg-gray-50 text-right">
                <Link
                  href="/comandas"
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  Ver todas las comandas
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
