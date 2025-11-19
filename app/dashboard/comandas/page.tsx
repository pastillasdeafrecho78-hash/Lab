'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Comanda {
  id: string
  numeroComanda: string
  estado: string
  fechaCreacion: string
  cliente: {
    id: string
    nombre: string
    apellido: string
    email: string
  }
  sucursal: {
    id: string
    nombre: string
  }
  tipoPrueba: {
    id: string
    nombre: string
  }
  elementos: string[]
  creadoPor: {
    id: string
    nombre: string
    apellido: string
  }
  asignadoA?: {
    id: string
    nombre: string
    apellido: string
  }
  resultados: any[]
}

interface Cliente {
  id: string
  nombre: string
  apellido: string
  email: string
}

interface Sucursal {
  id: string
  nombre: string
}

interface TipoPrueba {
  id: string
  nombre: string
  elementos: string[]
}

interface UsuarioActual {
  id: string
  nombre: string
  apellido: string
  rol: string
  permisos: string[]
}

type FormState = {
  clienteId: string
  sucursalId: string
  tipoPruebaId: string
  elementos: string[]
  observaciones: string
  asignacionAutomatica: boolean
}

type NewClientState = {
  nombre: string
  apellido: string
  email: string
  telefono: string
}

const createInitialFormState = (): FormState => ({
  clienteId: '',
  sucursalId: '',
  tipoPruebaId: '',
  elementos: [],
  observaciones: '',
  asignacionAutomatica: false
})

const createInitialNewClientState = (): NewClientState => ({
  nombre: '',
  apellido: '',
  email: '',
  telefono: ''
})

export default function ComandasPage() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [tiposPrueba, setTiposPrueba] = useState<TipoPrueba[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterSucursal, setFilterSucursal] = useState('')
  const [currentUser, setCurrentUser] = useState<UsuarioActual | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState<FormState>(() => createInitialFormState())
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientData, setNewClientData] = useState<NewClientState>(() => createInitialNewClientState())
  const [creatingClient, setCreatingClient] = useState(false)

  const canRegisterClients = currentUser?.permisos?.includes('clientes.editar') ?? false

  // Formulario de nueva comanda
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (clientes.length === 0 && canRegisterClients) {
      setShowNewClientForm(true)
    }
  }, [clientes.length, canRegisterClients])

  const resetFormState = () => {
    setFormData(createInitialFormState())
    setNewClientData(createInitialNewClientState())
    if (clientes.length === 0 && canRegisterClients) {
      setShowNewClientForm(true)
    } else {
      setShowNewClientForm(false)
    }
  }

  const openModal = () => {
    resetFormState()
    setShowModal(true)
  }

  const closeModal = () => {
    resetFormState()
    setShowModal(false)
  }

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      const [comandasRes, clientesRes, sucursalesRes, tiposRes, meRes] = await Promise.all([
        fetch('/api/comandas', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/clientes', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/sucursales', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/tipos-prueba', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const [comandasData, clientesData, sucursalesData, tiposData, meData] = await Promise.all([
        comandasRes.json(),
        clientesRes.json(),
        sucursalesRes.json(),
        tiposRes.json(),
        meRes.json()
      ])

      if (!meRes.ok || !meData.success) {
        toast.error(meData.error || 'Sesión inválida, inicia sesión nuevamente')
        router.push('/')
        return
      }

      setCurrentUser({
        id: meData.data.id,
        nombre: meData.data.nombre,
        apellido: meData.data.apellido,
        rol: meData.data.rol,
        permisos: meData.data.permisos || []
      })

      if (comandasData.success) setComandas(comandasData.data)
      if (clientesData.success) setClientes(clientesData.data)
      if (sucursalesData.success) setSucursales(sucursalesData.data)
      if (tiposData.success) setTiposPrueba(tiposData.data)

    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCliente = async () => {
    if (!canRegisterClients) {
      toast.error('No tienes permisos para registrar clientes')
      return
    }

    if (!newClientData.nombre.trim() || !newClientData.apellido.trim() || !newClientData.email.trim()) {
      toast.error('Nombre, apellido y email son obligatorios')
      return
    }

    try {
      setCreatingClient(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: newClientData.nombre.trim(),
          apellido: newClientData.apellido.trim(),
          email: newClientData.email.trim(),
          telefono: newClientData.telefono.trim() || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Cliente registrado correctamente')
        setClientes(prev => {
          const updated = [...prev, data.data]
          return updated.sort((a, b) =>
            `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es', { sensitivity: 'base' })
          )
        })
        setFormData(prev => ({ ...prev, clienteId: data.data.id }))
        setNewClientData(createInitialNewClientState())
        setShowNewClientForm(false)
      } else {
        toast.error(data.error || 'Error al registrar cliente')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setCreatingClient(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.clienteId || (!formData.sucursalId && !formData.asignacionAutomatica) || !formData.tipoPruebaId || formData.elementos.length === 0) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/comandas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Comanda creada exitosamente')
        closeModal()
        loadData()
      } else {
        toast.error(data.error || 'Error al crear comanda')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleTipoPruebaChange = (tipoId: string) => {
    const tipo = tiposPrueba.find(t => t.id === tipoId)
    if (tipo) {
      setFormData(prev => ({
        ...prev,
        tipoPruebaId: tipoId,
        elementos: tipo.elementos
      }))
    }
  }

  const toggleElemento = (elemento: string) => {
    setFormData(prev => ({
      ...prev,
      elementos: prev.elementos.includes(elemento)
        ? prev.elementos.filter(e => e !== elemento)
        : [...prev.elementos, elemento]
    }))
  }

  const getEstadoBadge = (estado: string) => {
    const badges = {
      PENDIENTE: 'badge-warning',
      EN_PROCESO: 'badge-primary',
      COMPLETADA: 'badge-success',
      ENTREGADA: 'badge-secondary',
      CANCELADA: 'badge-danger'
    }
    return badges[estado as keyof typeof badges] || 'badge-secondary'
  }

  const filteredComandas = comandas.filter(comanda => {
    const matchesSearch = comanda.numeroComanda.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comanda.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comanda.cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesEstado = !filterEstado || comanda.estado === filterEstado
    const matchesSucursal = !filterSucursal || comanda.sucursal.id === filterSucursal

    return matchesSearch && matchesEstado && matchesSucursal
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
                className="mr-4 p-2 rounded-lg bg-secondary-50 text-secondary-700 hover:bg-secondary-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-secondary-900">Gestión de Comandas</h1>
            </div>
            
            <button
              onClick={openModal}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Nueva Comanda
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
                  placeholder="Buscar por número, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="input"
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="COMPLETADA">Completada</option>
                <option value="ENTREGADA">Entregada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>

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

        {/* Tabla de Comandas */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Comanda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Tipo de Prueba
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {filteredComandas.map((comanda) => (
                  <tr key={comanda.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-secondary-900">
                        {comanda.numeroComanda}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary-900">
                        {comanda.cliente.nombre} {comanda.cliente.apellido}
                      </div>
                      <div className="text-sm text-secondary-500">
                        {comanda.cliente.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary-900">
                        {comanda.sucursal.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary-900">
                        {comanda.tipoPrueba.nombre}
                      </div>
                      <div className="text-sm text-secondary-500">
                        {comanda.elementos.length} elementos
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getEstadoBadge(comanda.estado)}`}>
                        {comanda.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                      {new Date(comanda.fechaCreacion).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/dashboard/comandas/${comanda.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/comandas/${comanda.id}/editar`)}
                          className="text-secondary-600 hover:text-secondary-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Nueva Comanda */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-secondary-900">Nueva Comanda</h2>
                <button
                  onClick={closeModal}
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
                      Cliente *
                    </label>
                    <select
                      value={formData.clienteId}
                      onChange={(e) => setFormData(prev => ({ ...prev, clienteId: e.target.value }))}
                      className="input"
                      required
                    >
                      <option value="">Seleccionar cliente</option>
                      {clientes.map(cliente => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre} {cliente.apellido} - {cliente.email}
                        </option>
                      ))}
                    </select>
                    {canRegisterClients ? (
                      <>
                        {clientes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowNewClientForm(prev => !prev)}
                            className="mt-3 text-sm text-primary-600 hover:text-primary-800"
                          >
                            {showNewClientForm ? 'Ocultar formulario de nuevo cliente' : 'Registrar nuevo cliente'}
                          </button>
                        )}

                        {(showNewClientForm || clientes.length === 0) && (
                          <div className="mt-4 space-y-4 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                  Nombre *
                                </label>
                                <input
                                  type="text"
                                  value={newClientData.nombre}
                                  onChange={(e) => setNewClientData(prev => ({ ...prev, nombre: e.target.value }))}
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                  Apellido *
                                </label>
                                <input
                                  type="text"
                                  value={newClientData.apellido}
                                  onChange={(e) => setNewClientData(prev => ({ ...prev, apellido: e.target.value }))}
                                  className="input"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                  Email *
                                </label>
                                <input
                                  type="email"
                                  value={newClientData.email}
                                  onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                  Teléfono
                                </label>
                                <input
                                  type="tel"
                                  value={newClientData.telefono}
                                  onChange={(e) => setNewClientData(prev => ({ ...prev, telefono: e.target.value }))}
                                  className="input"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                              {clientes.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowNewClientForm(false)
                                    setNewClientData(createInitialNewClientState())
                                  }}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Cancelar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleCreateCliente}
                                className="btn btn-primary btn-sm"
                                disabled={creatingClient}
                              >
                                {creatingClient ? 'Registrando...' : 'Registrar Cliente'}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      clientes.length === 0 && (
                        <p className="mt-3 text-sm text-danger-600">
                          No hay clientes disponibles y no tienes permisos para registrarlos.
                        </p>
                      )
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Sucursal *
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.asignacionAutomatica}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            asignacionAutomatica: e.target.checked,
                            sucursalId: e.target.checked ? '' : prev.sucursalId
                          }))}
                          className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-secondary-700">
                          Asignar automáticamente (basado en dirección del cliente)
                        </span>
                      </label>
                      <select
                        value={formData.sucursalId}
                        onChange={(e) => setFormData(prev => ({ ...prev, sucursalId: e.target.value }))}
                        className="input"
                        required={!formData.asignacionAutomatica}
                        disabled={formData.asignacionAutomatica}
                      >
                        <option value="">Seleccionar sucursal</option>
                        {sucursales.map(sucursal => (
                          <option key={sucursal.id} value={sucursal.id}>
                            {sucursal.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Tipo de Prueba *
                  </label>
                  <select
                    value={formData.tipoPruebaId}
                    onChange={(e) => handleTipoPruebaChange(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Seleccionar tipo de prueba</option>
                    {tiposPrueba.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.tipoPruebaId && (
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Elementos a Incluir *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {tiposPrueba.find(t => t.id === formData.tipoPruebaId)?.elementos.map(elemento => (
                        <label key={elemento} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.elementos.includes(elemento)}
                            onChange={() => toggleElemento(elemento)}
                            className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-secondary-700">
                            {elemento.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                    className="input"
                    rows={3}
                    placeholder="Observaciones adicionales..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Crear Comanda
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
