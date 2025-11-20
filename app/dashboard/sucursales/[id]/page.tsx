'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BuildingOfficeIcon,
  UserGroupIcon,
  CpuChipIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Sucursal {
  id: string
  nombre: string
  direccion: string
  telefono: string
  email?: string
  activa: boolean
  usuarios: Array<{
    usuario: {
      id: string
      nombre: string
      apellido: string
      email: string
      telefono?: string
      rol: string
      activo: boolean
    }
  }>
  maquinaria: Array<{
    id: string
    nombre: string
    modelo?: string
    marca?: string
    activa: boolean
    pruebas: Array<{
      tipoPrueba: {
        id: string
        nombre: string
      }
    }>
  }>
  _count: {
    comandas: number
    usuarios: number
    maquinaria: number
  }
}

export default function SucursalDetailPage({ params }: { params: { id: string } }) {
  const [sucursal, setSucursal] = useState<Sucursal | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadSucursal()
  }, [params.id])

  const loadSucursal = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      const response = await fetch(`/api/sucursales/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setSucursal(data.data)
      } else {
        toast.error(data.error || 'Error al cargar sucursal')
        router.push('/dashboard/sucursales')
      }
    } catch (error) {
      toast.error('Error de conexión')
      router.push('/dashboard/sucursales')
    } finally {
      setLoading(false)
    }
  }

  const getRolLabel = (rol: string) => {
    const roles: Record<string, string> = {
      SUPER_ADMIN: 'Super Administrador',
      RESPONSABLE_SANITARIO: 'Responsable Sanitario',
      RESPONSABLE_SUCURSAL: 'Responsable Sucursal',
      TECNICO_LABORATORIO: 'Técnico Laboratorio',
      RECEPCION: 'Recepción'
    }
    return roles[rol] || rol
  }

  const getRolBadge = (rol: string) => {
    const badges: Record<string, string> = {
      SUPER_ADMIN: 'badge-danger',
      RESPONSABLE_SANITARIO: 'badge-warning',
      RESPONSABLE_SUCURSAL: 'badge-primary',
      TECNICO_LABORATORIO: 'badge-success',
      RECEPCION: 'badge-secondary'
    }
    return badges[rol] || 'badge-secondary'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!sucursal) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-100 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/sucursales')}
                className="mr-4 p-2 rounded-lg bg-gray-50 text-secondary hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-6 w-6 text-primary-600 mr-3" />
                <h1 className="text-xl font-semibold text-primary">{sucursal.nombre}</h1>
                <span className={`ml-4 badge ${sucursal.activa ? 'badge-success' : 'badge-danger'}`}>
                  {sucursal.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información de Contacto */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-primary">Información de Contacto</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPinIcon className="h-5 w-5 text-tertiary mr-3 mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-tertiary">Dirección</label>
                    <p className="text-primary">{sucursal.direccion}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <PhoneIcon className="h-5 w-5 text-tertiary mr-3 mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-tertiary">Teléfono</label>
                    <p className="text-primary">{sucursal.telefono}</p>
                  </div>
                </div>
                {sucursal.email && (
                  <div className="flex items-start">
                    <EnvelopeIcon className="h-5 w-5 text-tertiary mr-3 mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-tertiary">Email</label>
                      <p className="text-primary">{sucursal.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Usuarios */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Usuarios</h3>
                  <span className="badge badge-secondary">{sucursal._count.usuarios}</span>
                </div>
              </div>
              {sucursal.usuarios.length > 0 ? (
                <div className="space-y-3">
                  {sucursal.usuarios.map(({ usuario }) => (
                    <div key={usuario.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="p-2 bg-primary-100 rounded-lg mr-3">
                          <UserGroupIcon className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {usuario.nombre} {usuario.apellido}
                          </p>
                          <p className="text-xs text-tertiary">{usuario.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${getRolBadge(usuario.rol)}`}>
                          {getRolLabel(usuario.rol)}
                        </span>
                        <span className={`badge ${usuario.activo ? 'badge-success' : 'badge-danger'}`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-tertiary text-center py-4">No hay usuarios asignados</p>
              )}
            </div>

            {/* Maquinaria */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Equipos</h3>
                  <span className="badge badge-secondary">{sucursal._count.maquinaria}</span>
                </div>
              </div>
              {sucursal.maquinaria.length > 0 ? (
                <div className="space-y-3">
                  {sucursal.maquinaria.map((equipo) => (
                    <div key={equipo.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="p-2 bg-primary-100 rounded-lg mr-3">
                            <CpuChipIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary">{equipo.nombre}</p>
                            {(equipo.marca || equipo.modelo) && (
                              <p className="text-xs text-tertiary">
                                {equipo.marca} {equipo.modelo}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`badge ${equipo.activa ? 'badge-success' : 'badge-danger'}`}>
                          {equipo.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      {equipo.pruebas.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-tertiary mb-1">Pruebas asignadas:</p>
                          <div className="flex flex-wrap gap-1">
                            {equipo.pruebas.map((prueba, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-gray-200 text-primary rounded">
                                {prueba.tipoPrueba.nombre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-tertiary text-center py-4">No hay equipos asignados</p>
              )}
            </div>
          </div>

          {/* Estadísticas */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-primary">Estadísticas</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-tertiary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm text-secondary">Comandas</span>
                  </div>
                  <span className="text-lg font-semibold text-primary">{sucursal._count.comandas}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-tertiary mr-2" />
                    <span className="text-sm text-secondary">Usuarios</span>
                  </div>
                  <span className="text-lg font-semibold text-primary">{sucursal._count.usuarios}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CpuChipIcon className="h-5 w-5 text-tertiary mr-2" />
                    <span className="text-sm text-secondary">Equipos</span>
                  </div>
                  <span className="text-lg font-semibold text-primary">{sucursal._count.maquinaria}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

