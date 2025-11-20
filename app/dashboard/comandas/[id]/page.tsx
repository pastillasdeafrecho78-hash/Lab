'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Analito {
  id: string
  nombre: string
  unidad?: string | null
}

interface CategoriaAnalito {
  id: string
  nombre: string
  descripcion?: string | null
  analitos: Array<{
    analito: Analito
    orden: number
  }>
}

interface Comanda {
  id: string
  numeroComanda: string
  estado: string
  fechaCreacion: string
  fechaAsignacion?: string
  fechaCompletado?: string
  fechaEntrega?: string
  fechaArchivado?: string
  observaciones?: string
  archivada?: boolean
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
  historial?: Array<{
    id: string
    tipoCambio: string
    campoAnterior?: string | null
    campoNuevo?: string | null
    descripcion: string
    fechaModificacion: string
    modificadoPor: {
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
  const [categorias, setCategorias] = useState<CategoriaAnalito[]>([])
  const [analitos, setAnalitos] = useState<Analito[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)
  const [categoriaSearchTerm, setCategoriaSearchTerm] = useState('')
  const [editData, setEditData] = useState({
    estado: '',
    asignadoAId: '',
    observaciones: '',
    categoriaId: '',
    elementos: [] as string[]
  })
  const router = useRouter()

  useEffect(() => {
    loadComanda()
    loadUsuarios()
    loadCatalogData()
  }, [params.id])

  useEffect(() => {
    // Cuando se cargan las categorías, buscar la categoría actual del tipoPrueba
    if (comanda && categorias.length > 0) {
      const tipoPrueba = comanda.tipoPrueba
      // Buscar categoría que coincida con el nombre del tipoPrueba
      const categoriaActual = categorias.find(c => 
        c.nombre === tipoPrueba.nombre || 
        tipoPrueba.nombre.includes(c.nombre) ||
        c.nombre.includes(tipoPrueba.nombre)
      )
      
      if (categoriaActual) {
        setEditData(prev => ({
          ...prev,
          categoriaId: categoriaActual.id
        }))
      }
    }
  }, [comanda, categorias])

  const loadCatalogData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const [categoriasRes, analitosRes] = await Promise.all([
        fetch('/api/categorias-analito', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/analitos', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const categoriasData = await categoriasRes.json()
      const analitosData = await analitosRes.json()

      if (categoriasData.success) setCategorias(categoriasData.data)
      if (analitosData.success) setAnalitos(analitosData.data)
    } catch (error) {
      console.error('Error al cargar catálogo:', error)
    }
  }

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
        // Buscar la categoría actual del tipoPrueba
        const tipoPrueba = data.data.tipoPrueba
        setEditData({
          estado: data.data.estado,
          asignadoAId: data.data.asignadoA?.id || '',
          observaciones: data.data.observaciones || '',
          categoriaId: '', // Se establecerá después de cargar categorías
          elementos: data.data.elementos || []
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
      const updatePayload: any = {}

      // Solo incluir estado si realmente cambió
      if (editData.estado && editData.estado !== comanda?.estado) {
        updatePayload.estado = editData.estado
      }

      // Solo incluir asignadoAId si cambió
      if (editData.asignadoAId !== comanda?.asignadoAId) {
        updatePayload.asignadoAId = editData.asignadoAId || undefined
      }

      // Solo incluir observaciones si cambió
      if (editData.observaciones !== comanda?.observaciones) {
        updatePayload.observaciones = editData.observaciones || undefined
      }

      // Si se cambió la categoría, incluirla
      if (editData.categoriaId && editData.categoriaId !== comanda?.tipoPrueba.id) {
        updatePayload.categoriaId = editData.categoriaId
      }

      // Si se modificaron elementos, incluirlos
      const elementosActuales = (comanda?.elementos || []).sort()
      const elementosNuevos = editData.elementos.sort()
      if (JSON.stringify(elementosNuevos) !== JSON.stringify(elementosActuales)) {
        updatePayload.elementos = editData.elementos
      }

      // Si no hay cambios, mostrar mensaje y salir
      if (Object.keys(updatePayload).length === 0) {
        toast.info('No hay cambios para guardar')
        return
      }

      const response = await fetch(`/api/comandas/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
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
      ENTREGADA: 'badge-secondary'
    }
    return badges[estado as keyof typeof badges] || 'badge-secondary'
  }

  const getEstadoColor = (estado: string) => {
    const colors = {
      PENDIENTE: 'text-warning-600',
      EN_PROCESO: 'text-primary-600',
      COMPLETADA: 'text-success-600',
      ENTREGADA: 'text-secondary-600'
    }
    return colors[estado as keyof typeof colors] || 'text-secondary-600'
  }

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      PENDIENTE: 'Registrada',
      EN_PROCESO: 'En Proceso',
      COMPLETADA: 'Finalizada',
      ENTREGADA: 'Entregada'
    }
    return labels[estado] || estado
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

  const handleArchivar = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/comandas/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ archivada: !comanda?.archivada })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(comanda?.archivada ? 'Comanda desarchivada' : 'Comanda archivada')
        loadComanda()
      } else {
        toast.error(data.error || 'Error al archivar comanda')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleEstadoChange = async (nuevoEstado: string) => {
    if (!comanda || comanda.estado === nuevoEstado) return

    try {
      const token = localStorage.getItem('token')
      const updatePayload: any = {
        estado: nuevoEstado
      }

      // Si se cambia a EN_PROCESO y hay usuarios disponibles, asignar automáticamente
      if (nuevoEstado === 'EN_PROCESO' && usuarios.length > 0 && !comanda.asignadoA) {
        updatePayload.asignadoAId = usuarios[0].id
      }

      const response = await fetch(`/api/comandas/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Estado cambiado a ${getEstadoLabel(nuevoEstado)}`)
        loadComanda()
      } else {
        toast.error(data.error || 'Error al cambiar estado')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleCategoriaChange = (categoriaId: string) => {
    const categoria = categorias.find(c => c.id === categoriaId)
    if (categoria) {
      const elementos = categoria.analitos.map(d => d.analito.nombre)
      setEditData(prev => ({
        ...prev,
        categoriaId,
        elementos: [...new Set([...prev.elementos, ...elementos])] // Agregar sin duplicar
      }))
    }
  }

  const toggleElemento = (elemento: string) => {
    setEditData(prev => ({
      ...prev,
      elementos: prev.elementos.includes(elemento)
        ? prev.elementos.filter(e => e !== elemento)
        : [...prev.elementos, elemento]
    }))
  }

  const filteredCategorias = categorias.filter(categoria => {
    if (!categoriaSearchTerm) return true
    const searchLower = categoriaSearchTerm.toLowerCase()
    return (
      categoria.nombre.toLowerCase().includes(searchLower) ||
      categoria.descripcion?.toLowerCase().includes(searchLower) ||
      categoria.analitos.some(detalle => 
        detalle.analito.nombre.toLowerCase().includes(searchLower)
      )
    )
  })

  const getTipoCambioLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'AGREGAR_CATEGORIA': 'Categoría agregada',
      'QUITAR_CATEGORIA': 'Categoría quitada',
      'AGREGAR_PARAMETRO': 'Parámetro agregado',
      'QUITAR_PARAMETRO': 'Parámetro quitado',
      'MODIFICAR_ESTADO': 'Estado modificado',
      'MODIFICAR_ASIGNACION': 'Asignación modificada',
      'MODIFICAR_OBSERVACIONES': 'Observaciones modificadas',
      'MODIFICAR_CATEGORIA': 'Categoría modificada'
    }
    return labels[tipo] || tipo
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
                className="mr-4 p-2 rounded-lg bg-secondary-50 text-secondary-700 hover:bg-secondary-100"
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
            
            <div className="flex items-center space-x-3">
              {/* Botones de Estado */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEstadoChange('PENDIENTE')}
                  className={`btn btn-sm ${
                    comanda.estado === 'PENDIENTE' 
                      ? 'btn-warning' 
                      : 'btn-secondary'
                  }`}
                  disabled={comanda.estado === 'PENDIENTE'}
                >
                  Registrada
                </button>
                <button
                  onClick={() => handleEstadoChange('EN_PROCESO')}
                  className={`btn btn-sm ${
                    comanda.estado === 'EN_PROCESO' 
                      ? 'btn-primary' 
                      : 'btn-secondary'
                  }`}
                  disabled={comanda.estado === 'EN_PROCESO'}
                >
                  En Proceso
                </button>
                <button
                  onClick={() => handleEstadoChange('COMPLETADA')}
                  className={`btn btn-sm ${
                    comanda.estado === 'COMPLETADA' 
                      ? 'btn-success' 
                      : 'btn-secondary'
                  }`}
                  disabled={comanda.estado === 'COMPLETADA'}
                >
                  Finalizada
                </button>
                <button
                  onClick={() => handleEstadoChange('ENTREGADA')}
                  className={`btn btn-sm ${
                    comanda.estado === 'ENTREGADA' 
                      ? 'bg-secondary-600 text-white' 
                      : 'btn-secondary'
                  }`}
                  disabled={comanda.estado === 'ENTREGADA'}
                >
                  Entregada
                </button>
              </div>
              
              <div className="ml-4">
                <button
                  onClick={handleArchivar}
                  className={`btn ${comanda.archivada ? 'btn-secondary' : 'btn-warning'} btn-sm`}
                >
                  {comanda.archivada ? 'Desarchivar' : 'Archivar'}
                </button>
              </div>
              
              {canEdit() && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Editar
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
                    {getEstadoLabel(comanda.estado)}
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

        {/* Historial de Cambios */}
        {comanda.historial && comanda.historial.length > 0 && (
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Historial de Modificaciones
              </h3>
              <button
                onClick={() => setShowHistorial(!showHistorial)}
                className="text-sm text-primary-600 hover:text-primary-900"
              >
                {showHistorial ? 'Ocultar' : 'Ver historial'}
              </button>
            </div>
            {showHistorial && (
              <div className="space-y-3">
                {comanda.historial.map((cambio) => (
                  <div
                    key={cambio.id}
                    className="border-l-4 border-primary-500 pl-4 py-2 bg-secondary-50 rounded"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-secondary-900">
                          {getTipoCambioLabel(cambio.tipoCambio)}
                        </p>
                        <p className="text-xs text-secondary-600 mt-1">{cambio.descripcion}</p>
                        {cambio.campoAnterior && cambio.campoNuevo && (
                          <div className="mt-2 text-xs">
                            <span className="text-danger-600 line-through">{cambio.campoAnterior}</span>
                            {' → '}
                            <span className="text-success-600 font-medium">{cambio.campoNuevo}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-secondary-500">
                          {new Date(cambio.fechaModificacion).toLocaleString('es-ES')}
                        </p>
                        <p className="text-xs text-secondary-400">
                          {cambio.modificadoPor.nombre} {cambio.modificadoPor.apellido}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Editar */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto my-4">
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

              <div className="space-y-6">
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

                {/* Sección: Modificar Categoría */}
                <div className="border-t border-secondary-200 pt-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Agregar Categoría de Prueba
                  </label>
                  
                  <div className="mb-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
                      <input
                        type="text"
                        placeholder="Buscar categoría..."
                        value={categoriaSearchTerm}
                        onChange={(e) => setCategoriaSearchTerm(e.target.value)}
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-secondary-200 rounded-lg p-2 bg-secondary-50">
                    {filteredCategorias.length === 0 ? (
                      <p className="text-sm text-secondary-500 text-center py-4">
                        {categoriaSearchTerm ? 'No se encontraron categorías' : 'No hay categorías disponibles'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredCategorias.map(categoria => (
                          <button
                            key={categoria.id}
                            type="button"
                            onClick={() => handleCategoriaChange(categoria.id)}
                            className="w-full text-left p-2 rounded border border-secondary-200 bg-white hover:bg-primary-50 hover:border-primary-300 transition"
                          >
                            <p className="text-sm font-medium text-secondary-900">
                              {categoria.nombre}
                            </p>
                            <p className="text-xs text-secondary-500">
                              {categoria.analitos.length} parámetros
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sección: Parámetros Actuales */}
                {editData.elementos.length > 0 && (
                  <div className="border-t border-secondary-200 pt-4">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Parámetros Seleccionados ({editData.elementos.length})
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-secondary-200 rounded-lg p-3 bg-secondary-50">
                      {editData.elementos.map(elemento => {
                        const analito = analitos.find(a => a.nombre === elemento)
                        return (
                          <label
                            key={elemento}
                            className="flex items-center gap-2 p-2 bg-white rounded border border-secondary-200 hover:bg-secondary-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={() => toggleElemento(elemento)}
                              className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div className="flex-1">
                              <span className="text-sm text-secondary-700 font-medium">
                                {elemento}
                              </span>
                              {analito?.unidad && (
                                <span className="text-xs text-secondary-500 ml-2">
                                  ({analito.unidad})
                                </span>
                              )}
                            </div>
                            <TrashIcon className="h-4 w-4 text-danger-600" />
                          </label>
                        )
                      })}
                    </div>
                    <p className="text-xs text-secondary-500 mt-2">
                      Desmarca un parámetro para quitarlo de la comanda
                    </p>
                  </div>
                )}

                {/* Sección: Agregar Parámetros Individuales */}
                <div className="border-t border-secondary-200 pt-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Agregar Parámetros Individuales
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-secondary-200 rounded-lg p-3 bg-secondary-50">
                    {analitos
                      .filter(a => !editData.elementos.includes(a.nombre))
                      .map(analito => (
                        <label
                          key={analito.id}
                          className="flex items-center gap-2 p-2 bg-white rounded border border-secondary-200 hover:bg-primary-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => toggleElemento(analito.nombre)}
                            className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-secondary-700 font-medium">
                              {analito.nombre}
                            </span>
                            {analito.unidad && (
                              <span className="text-xs text-secondary-500 ml-2">
                                ({analito.unidad})
                              </span>
                            )}
                          </div>
                          <PlusIcon className="h-4 w-4 text-success-600" />
                        </label>
                      ))}
                  </div>
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
