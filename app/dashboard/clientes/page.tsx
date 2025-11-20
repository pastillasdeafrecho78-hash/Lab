'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  fechaNacimiento?: string
  genero?: string
  direccion?: string
  activo: boolean
  comandas?: Array<{
    id: string
    numeroComanda: string
    estado: string
    fechaCreacion: string
  }>
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const router = useRouter()

  // Formulario de nuevo/editar cliente
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    genero: '',
    direccion: ''
  })

  useEffect(() => {
    loadClientes()
  }, [currentPage, searchTerm])

  const loadClientes = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/clientes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setClientes(data.data)
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
        }
      } else {
        toast.error(data.error || 'Error al cargar clientes')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre || !formData.apellido || !formData.email) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = editingCliente 
        ? `/api/clientes/${editingCliente.id}`
        : '/api/clientes'
      
      const method = editingCliente ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingCliente ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente')
        setShowModal(false)
        setEditingCliente(null)
        resetForm()
        loadClientes()
      } else {
        toast.error(data.error || `Error al ${editingCliente ? 'actualizar' : 'crear'} cliente`)
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setFormData({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email,
      telefono: cliente.telefono || '',
      fechaNacimiento: cliente.fechaNacimiento ? cliente.fechaNacimiento.split('T')[0] : '',
      genero: cliente.genero || '',
      direccion: cliente.direccion || ''
    })
    setShowModal(true)
  }

  const handleViewComandas = (clienteId: string) => {
    router.push(`/dashboard/comandas?clienteId=${clienteId}`)
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      fechaNacimiento: '',
      genero: '',
      direccion: ''
    })
  }

  const handleNewCliente = () => {
    setEditingCliente(null)
    resetForm()
    setShowModal(true)
  }

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cliente.telefono && cliente.telefono.includes(searchTerm))
  )

  if (loading) {
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
              <h1 className="text-xl font-semibold text-primary">Gestión de Clientes</h1>
            </div>
            
            <button
              onClick={handleNewCliente}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Nuevo Cliente
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
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email, teléfono..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="input pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Clientes */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                    Información
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                    Comandas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-100 divide-y divide-secondary-200">
                {filteredClientes.map((cliente) => (
                  <tr 
                    key={cliente.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEdit(cliente)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-primary-100 rounded-lg mr-3">
                          <UserIcon className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-primary">
                            {cliente.nombre} {cliente.apellido}
                          </div>
                          {cliente.genero && (
                            <div className="text-sm text-tertiary capitalize">
                              {cliente.genero === 'M' ? 'Masculino' : cliente.genero === 'F' ? 'Femenino' : 'Otro'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-primary flex items-center mb-1">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-tertiary" />
                        {cliente.email}
                      </div>
                      {cliente.telefono && (
                        <div className="text-sm text-secondary flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2 text-tertiary" />
                          {cliente.telefono}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {cliente.fechaNacimiento && (
                        <div className="text-sm text-secondary mb-1">
                          Nacimiento: {new Date(cliente.fechaNacimiento).toLocaleDateString('es-ES')}
                        </div>
                      )}
                      {cliente.direccion && (
                        <div className="text-sm text-secondary flex items-start">
                          <MapPinIcon className="h-4 w-4 mr-2 text-tertiary mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{cliente.direccion}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-primary font-medium">
                        {cliente.comandas?.length || 0} comandas
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-secondary">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {filteredClientes.length === 0 && (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-primary mb-2">
                No se encontraron clientes
              </h3>
              <p className="text-tertiary">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer cliente'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Nuevo/Editar Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-100 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-primary">
                  {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingCliente(null)
                    resetForm()
                  }}
                  className="text-tertiary hover:text-secondary"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="input"
                      placeholder="Nombre"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Apellido *
                    </label>
                    <input
                      type="text"
                      value={formData.apellido}
                      onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                      className="input"
                      placeholder="Apellido"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="input"
                      placeholder="email@ejemplo.com"
                      required
                      disabled={!!editingCliente}
                    />
                    {editingCliente && (
                      <p className="text-xs text-tertiary mt-1">
                        El email no se puede modificar
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                      className="input"
                      placeholder="+52 123 456 7890"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, fechaNacimiento: e.target.value }))}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Género
                    </label>
                    <select
                      value={formData.genero}
                      onChange={(e) => setFormData(prev => ({ ...prev, genero: e.target.value }))}
                      className="input"
                    >
                      <option value="">Seleccionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Dirección
                  </label>
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                    className="input"
                    rows={3}
                    placeholder="Dirección completa"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCliente(null)
                      resetForm()
                    }}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingCliente ? 'Actualizar Cliente' : 'Crear Cliente'}
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

