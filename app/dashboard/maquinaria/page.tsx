'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  CpuChipIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Maquinaria {
  id: string
  nombre: string
  modelo?: string
  marca?: string
  serie?: string
  activa: boolean
  sucursal: {
    id: string
    nombre: string
  }
  pruebas: Array<{
    tipoPrueba: {
      id: string
      nombre: string
    }
  }>
  _count: {
    pruebas: number
  }
}

interface Sucursal {
  id: string
  nombre: string
}

export default function MaquinariaPage() {
  const [maquinaria, setMaquinaria] = useState<Maquinaria[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSucursal, setFilterSucursal] = useState('')
  const router = useRouter()

  // Formulario de nueva maquinaria
  const [formData, setFormData] = useState({
    nombre: '',
    modelo: '',
    marca: '',
    serie: '',
    sucursalId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      const [maquinariaRes, sucursalesRes] = await Promise.all([
        fetch('/api/maquinaria', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/sucursales', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const [maquinariaData, sucursalesData] = await Promise.all([
        maquinariaRes.json(),
        sucursalesRes.json()
      ])

      if (maquinariaData.success) setMaquinaria(maquinariaData.data)
      if (sucursalesData.success) setSucursales(sucursalesData.data)

    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre || !formData.sucursalId) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/maquinaria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Maquinaria creada exitosamente')
        setShowModal(false)
        setFormData({
          nombre: '',
          modelo: '',
          marca: '',
          serie: '',
          sucursalId: ''
        })
        loadData()
      } else {
        toast.error(data.error || 'Error al crear maquinaria')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta maquinaria?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/maquinaria/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Maquinaria eliminada exitosamente')
        loadData()
      } else {
        toast.error(data.error || 'Error al eliminar maquinaria')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const filteredMaquinaria = maquinaria.filter(equipo => {
    const matchesSearch = equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipo.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipo.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipo.serie?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSucursal = !filterSucursal || equipo.sucursal.id === filterSucursal

    return matchesSearch && matchesSucursal
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 hover:bg-secondary-100 rounded-lg"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-secondary-900">Gestión de Maquinaria</h1>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Nueva Maquinaria
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Buscar maquinaria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={filterSucursal}
                onChange={(e) => setFilterSucursal(e.target.value)}
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
          </div>
        </div>

        {/* Grid de Maquinaria */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaquinaria.map((equipo) => (
            <div key={equipo.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-warning-100 rounded-lg mr-3">
                    <CpuChipIcon className="h-6 w-6 text-warning-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900">
                      {equipo.nombre}
                    </h3>
                    <p className="text-sm text-secondary-500">
                      {equipo.marca} {equipo.modelo}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/dashboard/maquinaria/${equipo.id}`)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/maquinaria/${equipo.id}/editar`)}
                    className="text-secondary-600 hover:text-secondary-900"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(equipo.id)}
                    className="text-danger-600 hover:text-danger-900"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-secondary-600">
                  <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                  {equipo.sucursal.nombre}
                </div>

                {equipo.serie && (
                  <div className="flex items-center text-sm text-secondary-600">
                    <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                    Serie: {equipo.serie}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-secondary-200">
                  <div className="flex items-center text-sm text-secondary-600">
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {equipo._count.pruebas} pruebas asignadas
                  </div>
                  <span className={`badge ${equipo.activa ? 'badge-success' : 'badge-danger'}`}>
                    {equipo.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {equipo.pruebas.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Pruebas Asignadas</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {equipo.pruebas.slice(0, 3).map(prueba => (
                        <span key={prueba.tipoPrueba.id} className="badge badge-primary text-xs">
                          {prueba.tipoPrueba.nombre}
                        </span>
                      ))}
                      {equipo.pruebas.length > 3 && (
                        <span className="badge badge-secondary text-xs">
                          +{equipo.pruebas.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredMaquinaria.length === 0 && (
          <div className="text-center py-12">
            <CpuChipIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No se encontró maquinaria
            </h3>
            <p className="text-secondary-500">
              {searchTerm || filterSucursal ? 'Intenta con otros filtros' : 'Registra tu primera maquinaria'}
            </p>
          </div>
        )}
      </main>

      {/* Modal Nueva Maquinaria */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-secondary-900">Nueva Maquinaria</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="input"
                    placeholder="Nombre del equipo"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={formData.marca}
                      onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                      className="input"
                      placeholder="Marca"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={formData.modelo}
                      onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                      className="input"
                      placeholder="Modelo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Número de Serie
                  </label>
                  <input
                    type="text"
                    value={formData.serie}
                    onChange={(e) => setFormData(prev => ({ ...prev, serie: e.target.value }))}
                    className="input"
                    placeholder="Número de serie"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Sucursal *
                  </label>
                  <select
                    value={formData.sucursalId}
                    onChange={(e) => setFormData(prev => ({ ...prev, sucursalId: e.target.value }))}
                    className="input"
                    required
                  >
                    <option value="">Seleccionar sucursal</option>
                    {sucursales.map(sucursal => (
                      <option key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Crear Maquinaria
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
