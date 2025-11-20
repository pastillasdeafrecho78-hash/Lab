'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CpuChipIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  BeakerIcon,
  SquaresPlusIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { getAuthToken, getAuthHeaders } from '@/lib/api-helpers'

interface Analito {
  id: string
  nombre: string
  unidad?: string | null
  descripcion?: string | null
}

interface CategoriaAnalito {
  id: string
  nombre: string
  descripcion?: string | null
  analitos: Array<{
    analito: Analito
  }>
}

interface MaquinariaDetalle {
  id: string
  nombre: string
  modelo?: string | null
  marca?: string | null
  serie?: string | null
  activa: boolean
  sucursal: {
    id: string
    nombre: string
    direccion?: string | null
    telefono?: string | null
  }
  pruebas: Array<{
    tipoPrueba: {
      id: string
      nombre: string
      analitosAsignados: Array<{
        analito: Analito
      }>
      categorias: Array<{
        categoria: CategoriaAnalito
      }>
    }
  }>
}

export default function MaquinariaDetailPage({ params }: { params: { id: string } }) {
  const [maquinaria, setMaquinaria] = useState<MaquinariaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadMaquinaria()
  }, [params.id])

  const loadMaquinaria = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        router.push('/')
        return
      }

      const response = await fetch(`/api/maquinaria/${params.id}`, {
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (data.success) {
        setMaquinaria(data.data)
      } else {
        toast.error(data.error || 'Error al cargar maquinaria')
        router.push('/dashboard/maquinaria')
      }
    } catch (error) {
      toast.error('Error de conexión')
      router.push('/dashboard/maquinaria')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!maquinaria) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Maquinaria no encontrada</h2>
          <button
            onClick={() => router.push('/dashboard/maquinaria')}
            className="btn btn-primary mt-4"
          >
            Volver a Maquinaria
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-100 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/maquinaria')}
                className="mr-4 p-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{maquinaria.nombre}</h1>
                <p className="text-sm text-gray-500">
                  {maquinaria.marca} {maquinaria.modelo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${maquinaria.activa ? 'badge-success' : 'badge-danger'}`}>
                {maquinaria.activa ? 'Activa' : 'Inactiva'}
              </span>
              <button
                onClick={() => router.push(`/dashboard/maquinaria/${maquinaria.id}/editar`)}
                className="btn btn-secondary"
              >
                <PencilIcon className="h-5 w-5 mr-2" />
                Editar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del Equipo */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Equipo</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CpuChipIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Nombre</p>
                    <p className="text-sm text-gray-600">{maquinaria.nombre}</p>
                  </div>
                </div>
                {(maquinaria.marca || maquinaria.modelo) && (
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-gray-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Marca y Modelo</p>
                      <p className="text-sm text-gray-600">
                        {maquinaria.marca} {maquinaria.modelo}
                      </p>
                    </div>
                  </div>
                )}
                {maquinaria.serie && (
                  <div className="flex items-start">
                    <WrenchScrewdriverIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Número de Serie</p>
                      <p className="text-sm text-gray-600">{maquinaria.serie}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Sucursal</p>
                    <p className="text-sm text-gray-600">{maquinaria.sucursal.nombre}</p>
                    {maquinaria.sucursal.direccion && (
                      <p className="text-xs text-gray-500 mt-1">{maquinaria.sucursal.direccion}</p>
                    )}
                    {maquinaria.sucursal.telefono && (
                      <p className="text-xs text-gray-500">{maquinaria.sucursal.telefono}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pruebas Asignadas - Formato Catálogo Clínico */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Pruebas Asignadas</h2>
                <span className="badge badge-secondary">{maquinaria.pruebas.length}</span>
              </div>
              {maquinaria.pruebas.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Categorías asignadas */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-md font-medium text-gray-700">Categorías</h3>
                      <span className="text-sm text-gray-500">
                        {maquinaria.pruebas.reduce((acc, p) => acc + p.tipoPrueba.categorias.length, 0)} asignadas
                      </span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {maquinaria.pruebas.map((prueba) =>
                        prueba.tipoPrueba.categorias.map((cat) => (
                          <div
                            key={`${prueba.tipoPrueba.id}-${cat.categoria.id}`}
                            className="p-3 bg-gray-50 rounded-lg"
                          >
                            <p className="text-sm font-medium text-gray-900">{cat.categoria.nombre}</p>
                            {cat.categoria.descripcion && (
                              <p className="text-xs text-gray-500 mt-1">{cat.categoria.descripcion}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {cat.categoria.analitos.length} parámetros
                            </p>
                            {cat.categoria.analitos.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {cat.categoria.analitos.map((analito) => (
                                  <span key={analito.analito.id} className="badge badge-secondary text-xs">
                                    {analito.analito.nombre}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Parámetros asignados */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-md font-medium text-gray-700">Parámetros</h3>
                      <span className="text-sm text-gray-500">
                        {maquinaria.pruebas.reduce((acc, p) => acc + p.tipoPrueba.analitosAsignados.length, 0)} asignados
                      </span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {maquinaria.pruebas.map((prueba) =>
                        prueba.tipoPrueba.analitosAsignados.map((analito) => (
                          <div
                            key={`${prueba.tipoPrueba.id}-${analito.analito.id}`}
                            className="p-2 bg-gray-50 rounded text-sm text-gray-700"
                          >
                            <span className="font-medium">{analito.analito.nombre}</span>
                            {analito.analito.unidad && (
                              <span className="text-gray-500 ml-2">({analito.analito.unidad})</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay pruebas asignadas a este equipo</p>
              )}
            </div>
          </div>

          {/* Sidebar - Estadísticas */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                  <div className="flex items-center">
                    <BeakerIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700">Pruebas</span>
                  </div>
                  <span className="text-lg font-semibold text-primary-600">
                    {maquinaria.pruebas.length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-600 mr-3" />
                    <span className="text-sm font-medium text-gray-700">Sucursal</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
                    {maquinaria.sucursal.nombre}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

