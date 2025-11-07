'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  UserGroupIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Usuario {
  id: string
  email: string
  nombre: string
  apellido: string
  telefono?: string
  rol: string
  activo: boolean
  ultimoAcceso?: string
  sucursales: Array<{
    id: string
    nombre: string
  }>
}

interface Sucursal {
  id: string
  nombre: string
}

const roles = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador' },
  { value: 'RESPONSABLE_SANITARIO', label: 'Responsable Sanitario' },
  { value: 'RESPONSABLE_SUCURSAL', label: 'Responsable Sucursal' },
  { value: 'TECNICO_LABORATORIO', label: 'Técnico Laboratorio' },
  { value: 'RECEPCION', label: 'Recepción' }
]

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRol, setFilterRol] = useState('')
  const router = useRouter()

  // Formulario de nuevo/editar usuario
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    apellido: '',
    telefono: '',
    password: '',
    rol: 'RECEPCION',
    sucursales: [] as string[]
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

      const [usuariosRes, sucursalesRes] = await Promise.all([
        fetch('/api/usuarios', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/sucursales', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const [usuariosData, sucursalesData] = await Promise.all([
        usuariosRes.json(),
        sucursalesRes.json()
      ])

      if (usuariosData.success) {
        setUsuarios(usuariosData.data)
      } else {
        toast.error(usuariosData.error || 'Error al cargar usuarios')
      }

      if (sucursalesData.success) {
        setSucursales(sucursalesData.data)
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.nombre || !formData.apellido || !formData.rol) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (!editingUsuario && !formData.password) {
      toast.error('La contraseña es requerida para nuevos usuarios')
      return
    }

    if (formData.sucursales.length === 0) {
      toast.error('Debes asignar al menos una sucursal')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = editingUsuario 
        ? `/api/usuarios/${editingUsuario.id}`
        : '/api/usuarios'
      
      const method = editingUsuario ? 'PUT' : 'POST'

      const body: any = {
        email: formData.email,
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        rol: formData.rol,
        sucursales: formData.sucursales
      }

      if (!editingUsuario || formData.password) {
        body.password = formData.password
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingUsuario ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente')
        setShowModal(false)
        setEditingUsuario(null)
        resetForm()
        loadData()
      } else {
        toast.error(data.error || `Error al ${editingUsuario ? 'actualizar' : 'crear'} usuario`)
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario)
    setFormData({
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      telefono: usuario.telefono || '',
      password: '',
      rol: usuario.rol,
      sucursales: usuario.sucursales.map(s => s.id)
    })
    setShowModal(true)
  }

  const toggleSucursal = (sucursalId: string) => {
    setFormData(prev => ({
      ...prev,
      sucursales: prev.sucursales.includes(sucursalId)
        ? prev.sucursales.filter(id => id !== sucursalId)
        : [...prev.sucursales, sucursalId]
    }))
  }

  const resetForm = () => {
    setFormData({
      email: '',
      nombre: '',
      apellido: '',
      telefono: '',
      password: '',
      rol: 'RECEPCION',
      sucursales: []
    })
  }

  const handleNewUsuario = () => {
    setEditingUsuario(null)
    resetForm()
    setShowModal(true)
  }

  const getRolLabel = (rol: string) => {
    return roles.find(r => r.value === rol)?.label || rol
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

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = 
      usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (usuario.telefono && usuario.telefono.includes(searchTerm))
    
    const matchesRol = !filterRol || usuario.rol === filterRol

    return matchesSearch && matchesRol
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
              <h1 className="text-xl font-semibold text-secondary-900">Gestión de Usuarios</h1>
            </div>
            
            <button
              onClick={handleNewUsuario}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Nuevo Usuario
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
                  placeholder="Buscar por nombre, email, teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            <div>
              <select
                value={filterRol}
                onChange={(e) => setFilterRol(e.target.value)}
                className="input"
              >
                <option value="">Todos los roles</option>
                {roles.map(rol => (
                  <option key={rol.value} value={rol.value}>
                    {rol.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Sucursales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Último Acceso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-primary-100 rounded-lg mr-3">
                          <UserGroupIcon className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-secondary-900">
                            {usuario.nombre} {usuario.apellido}
                          </div>
                          <div className="text-sm text-secondary-500">
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-secondary-900 flex items-center mb-1">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-secondary-400" />
                        {usuario.email}
                      </div>
                      {usuario.telefono && (
                        <div className="text-sm text-secondary-600 flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2 text-secondary-400" />
                          {usuario.telefono}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getRolBadge(usuario.rol)}`}>
                        {getRolLabel(usuario.rol)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {usuario.sucursales.map(sucursal => (
                          <span
                            key={sucursal.id}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary-100 text-secondary-800"
                          >
                            <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                            {sucursal.nombre}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                      {usuario.ultimoAcceso 
                        ? new Date(usuario.ultimoAcceso).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(usuario)}
                        className="text-secondary-600 hover:text-secondary-900"
                        title="Editar usuario"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsuarios.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">
                No se encontraron usuarios
              </h3>
              <p className="text-secondary-500">
                {searchTerm || filterRol ? 'Intenta con otros filtros' : 'Crea tu primer usuario'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Nuevo/Editar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-secondary-900">
                  {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingUsuario(null)
                    resetForm()
                  }}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
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
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
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
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="input"
                      placeholder="email@ejemplo.com"
                      required
                      disabled={!!editingUsuario}
                    />
                    {editingUsuario && (
                      <p className="text-xs text-secondary-500 mt-1">
                        El email no se puede modificar
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
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
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Rol *
                    </label>
                    <select
                      value={formData.rol}
                      onChange={(e) => setFormData(prev => ({ ...prev, rol: e.target.value }))}
                      className="input"
                      required
                    >
                      {roles.map(rol => (
                        <option key={rol.value} value={rol.value}>
                          {rol.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      {editingUsuario ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="input"
                      placeholder="••••••••"
                      required={!editingUsuario}
                      minLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Sucursales * (selecciona al menos una)
                  </label>
                  <div className="border border-secondary-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {sucursales.length === 0 ? (
                      <p className="text-sm text-secondary-500">No hay sucursales disponibles</p>
                    ) : (
                      <div className="space-y-2">
                        {sucursales.map(sucursal => (
                          <label key={sucursal.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.sucursales.includes(sucursal.id)}
                              onChange={() => toggleSucursal(sucursal.id)}
                              className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-secondary-700">
                              {sucursal.nombre}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.sucursales.length > 0 && (
                    <p className="text-xs text-secondary-500 mt-2">
                      {formData.sucursales.length} sucursal(es) seleccionada(s)
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingUsuario(null)
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
                    {editingUsuario ? 'Actualizar Usuario' : 'Crear Usuario'}
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

