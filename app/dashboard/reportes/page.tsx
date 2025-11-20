'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Estadisticas {
  resumen: {
    totalComandas: number
    comandasCompletadas: number
    comandasPendientes: number
    comandasEnProceso: number
    comandasEntregadas: number
    totalClientes: number
    totalSucursales: number
    totalUsuarios: number
  }
  porEstado: Record<string, number>
  porSucursal: Array<{
    sucursalId: string
    sucursalNombre: string
    cantidad: number
  }>
  porTipoPrueba: Array<{
    tipoPruebaId: string
    tipoPruebaNombre: string
    cantidad: number
  }>
  porDia: Array<{
    fecha: string
    cantidad: number
  }>
}

interface Sucursal {
  id: string
  nombre: string
}

export default function ReportesPage() {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [sucursalFiltro, setSucursalFiltro] = useState('')
  const router = useRouter()

  useEffect(() => {
    const hoy = new Date()
    const hace30Dias = new Date()
    hace30Dias.setDate(hace30Dias.getDate() - 30)
    
    setFechaInicio(hace30Dias.toISOString().split('T')[0])
    setFechaFin(hoy.toISOString().split('T')[0])
    
    loadSucursales()
  }, [])

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      loadEstadisticas()
    }
  }, [fechaInicio, fechaFin, sucursalFiltro])

  const loadSucursales = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      const response = await fetch('/api/sucursales', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setSucursales(data.data)
      }
    } catch (error) {
      console.error('Error al cargar sucursales:', error)
    }
  }

  const loadEstadisticas = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      const params = new URLSearchParams({
        fechaInicio,
        fechaFin
      })

      if (sucursalFiltro) {
        params.append('sucursalId', sucursalFiltro)
      }

      const response = await fetch(`/api/reportes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setEstadisticas(data.data)
      } else {
        toast.error(data.error || 'Error al cargar estadísticas')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const getMaxValue = (data: number[]) => {
    const max = Math.max(...data, 1)
    return Math.ceil(max * 1.1)
  }

  const renderBarChart = (data: Array<{ label: string; value: number }>, title: string) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-tertiary">
          No hay datos disponibles
        </div>
      )
    }

    const values = data.map(d => d.value)
    const maxValue = getMaxValue(values)

    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-secondary">{item.label}</span>
              <span className="text-sm text-secondary">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-primary-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderLineChart = (data: Array<{ fecha: string; cantidad: number }>) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-tertiary">
          No hay datos disponibles
        </div>
      )
    }

    const values = data.map(d => d.cantidad)
    const maxValue = getMaxValue(values)
    const minValue = Math.min(...values, 0)
    const range = maxValue - minValue || 1

    // Agrupar por día y formatear
    const puntos = data.map((item, index) => {
      const fecha = new Date(item.fecha)
      const x = (index / (data.length - 1 || 1)) * 100
      const y = 100 - ((item.cantidad - minValue) / range) * 100
      return { x, y, fecha: fecha.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }), cantidad: item.cantidad }
    })

    return (
      <div className="relative h-64">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="0.5"
            points={puntos.map(p => `${p.x},${p.y}`).join(' ')}
          />
          {puntos.map((punto, index) => (
            <circle
              key={index}
              cx={punto.x}
              cy={punto.y}
              r="1"
              fill="#2563eb"
            />
          ))}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-tertiary">
          {puntos.filter((_, i) => i % Math.ceil(puntos.length / 5) === 0).map((p, i) => (
            <span key={i}>{p.fecha}</span>
          ))}
        </div>
      </div>
    )
  }

  if (loading && !estadisticas) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
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
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 rounded-lg bg-gray-50 text-secondary hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-primary">Reportes y Estadísticas</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Sucursal
              </label>
              <select
                value={sucursalFiltro}
                onChange={(e) => setSucursalFiltro(e.target.value)}
                className="input"
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map(sucursal => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadEstadisticas}
                className="btn btn-primary w-full"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {estadisticas && (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-primary-100 rounded-lg mr-4">
                    <ChartBarIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary">Total Comandas</p>
                    <p className="text-2xl font-bold text-primary">
                      {estadisticas.resumen.totalComandas}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-success-100 rounded-lg mr-4">
                    <ChartBarIcon className="h-6 w-6 text-success-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary">Completadas</p>
                    <p className="text-2xl font-bold text-primary">
                      {estadisticas.resumen.comandasCompletadas}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-warning-100 rounded-lg mr-4">
                    <ChartBarIcon className="h-6 w-6 text-warning-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary">Pendientes</p>
                    <p className="text-2xl font-bold text-primary">
                      {estadisticas.resumen.comandasPendientes}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-gray-100 rounded-lg mr-4">
                    <ChartBarIcon className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary">En Proceso</p>
                    <p className="text-2xl font-bold text-primary">
                      {estadisticas.resumen.comandasEnProceso}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Comandas por Estado */}
              <div className="card">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Comandas por Estado
                </h3>
                {renderBarChart(
                  Object.entries(estadisticas.porEstado).map(([estado, cantidad]) => ({
                    label: estado.replace('_', ' '),
                    value: cantidad
                  })),
                  'Por Estado'
                )}
              </div>

              {/* Comandas por Sucursal */}
              <div className="card">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Comandas por Sucursal
                </h3>
                {renderBarChart(
                  estadisticas.porSucursal.map(s => ({
                    label: s.sucursalNombre,
                    value: s.cantidad
                  })),
                  'Por Sucursal'
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Comandas por Tipo de Prueba */}
              <div className="card">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Comandas por Tipo de Prueba
                </h3>
                {renderBarChart(
                  estadisticas.porTipoPrueba.map(t => ({
                    label: t.tipoPruebaNombre,
                    value: t.cantidad
                  })),
                  'Por Tipo'
                )}
              </div>

              {/* Tendencia de Comandas */}
              <div className="card">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Tendencia (Últimos 30 días)
                </h3>
                {renderLineChart(estadisticas.porDia)}
              </div>
            </div>

            {/* Estadísticas Adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="flex items-center mb-4">
                  <BuildingOfficeIcon className="h-5 w-5 text-tertiary mr-2" />
                  <h3 className="text-lg font-semibold text-primary">Sucursales</h3>
                </div>
                <p className="text-3xl font-bold text-primary">
                  {estadisticas.resumen.totalSucursales}
                </p>
              </div>

              <div className="card">
                <div className="flex items-center mb-4">
                  <ChartBarIcon className="h-5 w-5 text-tertiary mr-2" />
                  <h3 className="text-lg font-semibold text-primary">Clientes</h3>
                </div>
                <p className="text-3xl font-bold text-primary">
                  {estadisticas.resumen.totalClientes}
                </p>
              </div>

              <div className="card">
                <div className="flex items-center mb-4">
                  <CalendarIcon className="h-5 w-5 text-tertiary mr-2" />
                  <h3 className="text-lg font-semibold text-primary">Usuarios</h3>
                </div>
                <p className="text-3xl font-bold text-primary">
                  {estadisticas.resumen.totalUsuarios}
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

