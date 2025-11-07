'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Comanda {
  id: string
  numeroComanda: string
  estado: string
  fechaCreacion: string
  fechaAsignacion?: string
  fechaCompletado?: string
  fechaEntrega?: string
  observaciones?: string
  cliente: {
    id: string
    nombre: string
    apellido: string
    email: string
    telefono?: string
    fechaNacimiento?: string
  }
  sucursal: {
    id: string
    nombre: string
    direccion: string
    telefono: string
  }
  tipoPrueba: {
    id: string
    nombre: string
    elementos: string[]
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
  resultados: Array<{
    id: string
    elemento: string
    valor: number
    unidad: string
    rangoNormal: string
    observaciones?: string
    fechaRegistro: string
    registradoPor: {
      id: string
      nombre: string
      apellido: string
    }
  }>
}

interface Usuario {
  id: string
  nombre: string
  apellido: string
  rol: string
}

export default function ComandaDetailPage({ params }: { params: { id: string } }) {
  const [comanda, setComanda] = useState<Comanda | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState({
    estado: '',
    asignadoAId: '',
    observaciones: ''
  })
  const router = useRouter()

  useEffect(() => {
    loadComanda()
    loadUsuarios()
  }, [params.id])

  const loadComanda = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      const response = await fetch(`/api/comandas/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        setComanda(data.data)
        setEditData({
          estado: data.data.estado,
          asignadoAId: data.data.asignadoA?.id || '',
          observaciones: data.data.observaciones || ''
        })
      } else {
        toast.error(data.error || 'Error al cargar comanda')
        router.push('/dashboard/comandas')
      }
    } catch (error) {
      toast.error('Error de conexión')
      router.push('/dashboard/comandas')
    } finally {
      setLoading(false)
    }
  }

  const loadUsuarios = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setUsuarios(data.data.filter((u: Usuario) => 
          ['TECNICO_LABORATORIO', 'RESPONSABLE_SUCURSAL', 'RESPONSABLE_SANITARIO'].includes(u.rol)
        ))
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
    }
  }

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/comandas/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Comanda actualizada exitosamente')
        setShowEditModal(false)
        loadComanda()
      } else {
        toast.error(data.error || 'Error al actualizar comanda')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
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

  const getEstadoColor = (estado: string) => {
    const colors = {
      PENDIENTE: 'text-warning-600',
      EN_PROCESO: 'text-primary-600',
      COMPLETADA: 'text-success-600',
      ENTREGADA: 'text-secondary-600',
      CANCELADA: 'text-danger-600'
    }
    return colors[estado as keyof typeof colors] || 'text-secondary-600'
  }

  const canEdit = () => {
    if (!comanda) return false
    return ['PENDIENTE', 'EN_PROCESO'].includes(comanda.estado)
  }

  const canComplete = () => {
    if (!comanda) return false
    return comanda.estado === 'EN_PROCESO' && comanda.resultados.length > 0
  }

  const canDeliver = () => {
    if (!comanda) return false
    return comanda.estado === 'COMPLETADA'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!comanda) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-secondary-900 mb-4">Comanda no encontrada</h2>
          <button
            onClick={() => router.push('/dashboard/comandas')}
            className="btn btn-primary"
          >
            Volver a Comandas
          </button>
        </div>
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
                onClick={() => router.push('/dashboard/comandas')}
                className="mr-4 p-2 hover:bg-secondary-100 rounded-lg"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-secondary-900">
                  {comanda.numeroComanda}
                </h1>
                <p className="text-sm text-secondary-500">
                  {comanda.cliente.nombre} {comanda.cliente.apellido}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className={`badge ${getEstadoBadge(comanda.estado)}`}>
                {comanda.estado.replace('_', ' ')}
              </span>
              
              {canEdit() && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Editar
                </button>
              )}
              
              {canComplete() && (
                <button
                  onClick={() => {
                    setEditData(prev => ({ ...prev, estado: 'COMPLETADA' }))
                    handleUpdate()
                  }}
                  className="btn btn-success btn-sm"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Completar
                </button>
              )}
              
              {canDeliver() && (
                <button
                  onClick={() => {
                    setEditData(prev => ({ ...prev, estado: 'ENTREGADA' }))
                    handleUpdate()
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Entregar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del Cliente */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900">Información del Cliente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-secondary-500">Nombre Completo</label>
                  <p className="text-secondary-900">
                    {comanda.cliente.nombre} {comanda.cliente.apellido}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-500">Email</label>
                  <p className="text-secondary-900">{comanda.cliente.email}</p>
                </div>
                {comanda.cliente.telefono && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Teléfono</label>
                    <p className="text-secondary-900">{comanda.cliente.telefono}</p>
                  </div>
                )}
                {comanda.cliente.fechaNacimiento && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Fecha de Nacimiento</label>
                    <p className="text-secondary-900">
                      {new Date(comanda.cliente.fechaNacimiento).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Información de la Prueba */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900">Información de la Prueba</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-secondary-500">Tipo de Prueba</label>
                  <p className="text-secondary-900">{comanda.tipoPrueba.nombre}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-500">Elementos a Analizar</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {comanda.elementos.map(elemento => (
                      <span key={elemento} className="badge badge-primary">
                        {elemento.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                {comanda.observaciones && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Observaciones</label>
                    <p className="text-secondary-900">{comanda.observaciones}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Resultados */}
            {comanda.resultados.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-secondary-900">Resultados</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Elemento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Rango Normal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Registrado Por
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                      {comanda.resultados.map((resultado) => (
                        <tr key={resultado.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                            {resultado.elemento.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                            {resultado.valor} {resultado.unidad}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {resultado.rangoNormal}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {resultado.registradoPor.nombre} {resultado.registradoPor.apellido}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Estado y Fechas */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900">Estado y Fechas</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-secondary-500">Estado Actual</label>
                  <p className={`font-semibold ${getEstadoColor(comanda.estado)}`}>
                    {comanda.estado.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-500">Fecha de Creación</label>
                  <p className="text-secondary-900">
                    {new Date(comanda.fechaCreacion).toLocaleString('es-ES')}
                  </p>
                </div>
                {comanda.fechaAsignacion && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Fecha de Asignación</label>
                    <p className="text-secondary-900">
                      {new Date(comanda.fechaAsignacion).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}
                {comanda.fechaCompletado && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Fecha de Completado</label>
                    <p className="text-secondary-900">
                      {new Date(comanda.fechaCompletado).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}
                {comanda.fechaEntrega && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Fecha de Entrega</label>
                    <p className="text-secondary-900">
                      {new Date(comanda.fechaEntrega).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Información de la Sucursal */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900">Sucursal</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-secondary-500">Nombre</label>
                  <p className="text-secondary-900">{comanda.sucursal.nombre}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-500">Dirección</label>
                  <p className="text-secondary-900">{comanda.sucursal.direccion}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-500">Teléfono</label>
                  <p className="text-secondary-900">{comanda.sucursal.telefono}</p>
                </div>
              </div>
            </div>

            {/* Personal */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900">Personal</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-secondary-500">Creado Por</label>
                  <p className="text-secondary-900">
                    {comanda.creadoPor.nombre} {comanda.creadoPor.apellido}
                  </p>
                </div>
                {comanda.asignadoA && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Asignado A</label>
                    <p className="text-secondary-900">
                      {comanda.asignadoA.nombre} {comanda.asignadoA.apellido}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Editar */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-secondary-900">Editar Comanda</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={editData.estado}
                    onChange={(e) => setEditData(prev => ({ ...prev, estado: e.target.value }))}
                    className="input"
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="COMPLETADA">Completada</option>
                    <option value="ENTREGADA">Entregada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>

                {editData.estado === 'EN_PROCESO' && (
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Asignar A
                    </label>
                    <select
                      value={editData.asignadoAId}
                      onChange={(e) => setEditData(prev => ({ ...prev, asignadoAId: e.target.value }))}
                      className="input"
                    >
                      <option value="">Seleccionar técnico</option>
                      {usuarios.map(usuario => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.nombre} {usuario.apellido}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={editData.observaciones}
                    onChange={(e) => setEditData(prev => ({ ...prev, observaciones: e.target.value }))}
                    className="input"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdate}
                  className="btn btn-primary"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
