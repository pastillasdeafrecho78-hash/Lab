'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ArrowDownTrayIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { getAuthToken, getAuthHeaders } from '@/lib/api-helpers'

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
    tiempoPromedioHoras: number
  }
  porEstado: Record<string, number>
  porSucursal: Array<{
    sucursalId: string
    sucursalNombre: string
    cantidad: number
  }>
  porCategoria: Array<{
    categoriaNombre: string
    cantidad: number
  }>
  topAnalitos: Array<{
    analitoId: string
    analitoNombre: string
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
      const headers = getAuthHeaders()
      const response = await fetch('/api/sucursales', { headers })
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
      const headers = getAuthHeaders()

      const params = new URLSearchParams({
        fechaInicio,
        fechaFin
      })

      if (sucursalFiltro) {
        params.append('sucursalId', sucursalFiltro)
      }

      const response = await fetch(`/api/reportes?${params}`, { headers })
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

  const exportarPDF = () => {
    if (!estadisticas) return
    
    toast.info('Funcionalidad de exportación PDF próximamente')
    // TODO: Implementar exportación a PDF
  }

  const exportarExcel = () => {
    if (!estadisticas) return
    
    // Crear CSV simple
    const csvRows: string[] = []
    csvRows.push('Reporte de Comandas')
    csvRows.push(`Período: ${fechaInicio} a ${fechaFin}`)
    csvRows.push('')
    csvRows.push('Resumen')
    csvRows.push(`Total Comandas,${estadisticas.resumen.totalComandas}`)
    csvRows.push(`Completadas,${estadisticas.resumen.comandasCompletadas}`)
    csvRows.push(`Pendientes,${estadisticas.resumen.comandasPendientes}`)
    csvRows.push(`En Proceso,${estadisticas.resumen.comandasEnProceso}`)
    csvRows.push(`Entregadas,${estadisticas.resumen.comandasEntregadas}`)
    csvRows.push('')
    csvRows.push('Por Estado')
    Object.entries(estadisticas.porEstado).forEach(([estado, cantidad]) => {
      csvRows.push(`${estado},${cantidad}`)
    })
    csvRows.push('')
    csvRows.push('Por Sucursal')
    estadisticas.porSucursal.forEach(s => {
      csvRows.push(`${s.sucursalNombre},${s.cantidad}`)
    })
    
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte-comandas-${fechaInicio}-${fechaFin}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Reporte exportado exitosamente')
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
      return { 
        x, 
        y, 
        fecha: fecha.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }), 
        cantidad: item.cantidad 
      }
    })

    return (
      <div className="relative h-64">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="rgb(var(--color-primary-600))"
            strokeWidth="0.5"
            points={puntos.map(p => `${p.x},${p.y}`).join(' ')}
          />
          {puntos.map((punto, index) => (
            <circle
              key={index}
              cx={punto.x}
              cy={punto.y}
              r="1"
              fill="rgb(var(--color-primary-600))"
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

  const formatTiempo = (horas: number) => {
    if (horas < 1) {
      return `${Math.round(horas * 60)} minutos`
    } else if (horas < 24) {
      return `${Math.round(horas * 10) / 10} horas`
    } else {
      const dias = Math.floor(horas / 24)
      const horasRestantes = horas % 24
      return `${dias} día${dias > 1 ? 's' : ''} ${horasRestantes > 0 ? `y ${Math.round(horasRestantes)} horas` : ''}`
    }
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
            {estadisticas && (
              <div className="flex gap-2">
                <button
                  onClick={exportarExcel}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Exportar CSV
                </button>
                <button
                  onClick={exportarPDF}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Exportar PDF
                </button>
              </div>
            )}
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
                  <div className="p-3 bg-primary-100 rounded-lg mr-4">
                    <ClockIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary">Tiempo Promedio</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatTiempo(estadisticas.resumen.tiempoPromedioHoras)}
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
                    label: estado,
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
              {/* Top Categorías */}
              <div className="card">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Categorías Más Solicitadas
                </h3>
                {renderBarChart(
                  estadisticas.porCategoria.map(c => ({
                    label: c.categoriaNombre,
                    value: c.cantidad
                  })),
                  'Por Categoría'
                )}
              </div>

              {/* Top Analitos */}
              <div className="card">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Analitos Más Solicitados (Top 10)
                </h3>
                {renderBarChart(
                  estadisticas.topAnalitos.map(a => ({
                    label: a.analitoNombre,
                    value: a.cantidad
                  })),
                  'Top Analitos'
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Tendencia de Comandas */}
              <div className="card">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Tendencia de Comandas
                </h3>
                {renderLineChart(estadisticas.porDia)}
              </div>

              {/* Estadísticas Adicionales */}
              <div className="card">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Estadísticas Generales
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-tertiary mr-2" />
                      <span className="text-sm font-medium text-secondary">Sucursales</span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {estadisticas.resumen.totalSucursales}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <ChartBarIcon className="h-5 w-5 text-tertiary mr-2" />
                      <span className="text-sm font-medium text-secondary">Clientes</span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {estadisticas.resumen.totalClientes}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-tertiary mr-2" />
                      <span className="text-sm font-medium text-secondary">Usuarios</span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {estadisticas.resumen.totalUsuarios}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <ChartBarIcon className="h-5 w-5 text-tertiary mr-2" />
                      <span className="text-sm font-medium text-secondary">En Proceso</span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {estadisticas.resumen.comandasEnProceso}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <ChartBarIcon className="h-5 w-5 text-tertiary mr-2" />
                      <span className="text-sm font-medium text-secondary">Entregadas</span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {estadisticas.resumen.comandasEntregadas}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
