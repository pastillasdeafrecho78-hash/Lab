'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  CpuChipIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  SquaresPlusIcon,
  BeakerIcon,
  XMarkIcon
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

interface Analito {
  id: string
  nombre: string
  descripcion?: string | null
  unidad?: string | null
}

interface CategoriaAnalito {
  id: string
  nombre: string
  descripcion?: string | null
  analitos: Array<{
    analito: Analito
  }>
}

interface UsuarioActual {
  id: string
  nombre: string
  permisos: string[]
}

export default function MaquinariaPage() {
  const [maquinaria, setMaquinaria] = useState<Maquinaria[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSucursal, setFilterSucursal] = useState('')
  const [currentUser, setCurrentUser] = useState<UsuarioActual | null>(null)
  const [analitos, setAnalitos] = useState<Analito[]>([])
  const [categorias, setCategorias] = useState<CategoriaAnalito[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [showAnalitoModal, setShowAnalitoModal] = useState(false)
  const [showCategoriaModal, setShowCategoriaModal] = useState(false)
  const [editingAnalito, setEditingAnalito] = useState<Analito | null>(null)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaAnalito | null>(null)
  const [newAnalitoData, setNewAnalitoData] = useState({
    nombre: '',
    unidad: '',
    descripcion: ''
  })
  const [newCategoriaData, setNewCategoriaData] = useState({
    nombre: '',
    descripcion: '',
    analitoIds: [] as string[] // Mantiene el orden de selección
  })
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [creatingAnalito, setCreatingAnalito] = useState(false)
  const [creatingCategoria, setCreatingCategoria] = useState(false)
  const [showCatalogSection, setShowCatalogSection] = useState(false)
  const [unidadesPrevias, setUnidadesPrevias] = useState<string[]>([])
  const [showUnidadesDropdown, setShowUnidadesDropdown] = useState(false)
  const router = useRouter()

  // Unidades comunes por defecto
  const unidadesComunes = [
    'mg/dL', 'mmol/L', 'g/dL', 'U/L', 'mEq/L', '%', 'ng/mL', 
    'pg/mL', 'µg/dL', 'µmol/L', 'IU/L', 'cells/µL', 'fL', 'pg'
  ]

  // Cargar unidades previas desde localStorage
  useEffect(() => {
    const stored = localStorage.getItem('unidades_previas')
    if (stored) {
      try {
        const unidades = JSON.parse(stored)
        console.log('[UNIDADES] Cargadas desde localStorage:', unidades.length, 'unidades')
        setUnidadesPrevias(unidades)
      } catch (error) {
        console.error('Error al cargar unidades previas:', error)
        // Si hay error, inicializar con unidades comunes
        console.log('[UNIDADES] Inicializando con unidades comunes por defecto')
        setUnidadesPrevias(unidadesComunes)
        localStorage.setItem('unidades_previas', JSON.stringify(unidadesComunes))
      }
    } else {
      // Si no hay unidades guardadas, inicializar con unidades comunes
      console.log('[UNIDADES] No hay unidades guardadas, inicializando con unidades comunes:', unidadesComunes.length)
      setUnidadesPrevias(unidadesComunes)
      localStorage.setItem('unidades_previas', JSON.stringify(unidadesComunes))
    }
  }, [])

  // Guardar unidad en la lista de previas
  const guardarUnidadPrevia = (unidad: string) => {
    if (!unidad || !unidad.trim()) return
    
    const unidadTrimmed = unidad.trim()
    setUnidadesPrevias(prev => {
      // Evitar duplicados y mantener orden (más recientes primero)
      const nuevas = [unidadTrimmed, ...prev.filter(u => u !== unidadTrimmed)]
      // Limitar a 30 unidades
      const limitadas = nuevas.slice(0, 30)
      localStorage.setItem('unidades_previas', JSON.stringify(limitadas))
      return limitadas
    })
  }

  // Eliminar unidad de la lista de previas
  const eliminarUnidadPrevia = (unidad: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setUnidadesPrevias(prev => {
      const nuevas = prev.filter(u => u !== unidad)
      localStorage.setItem('unidades_previas', JSON.stringify(nuevas))
      return nuevas
    })
  }

  // Filtrar unidades previas según el texto del input
  const unidadesFiltradas = useMemo(() => {
    const inputValue = newAnalitoData.unidad.toLowerCase().trim()
    if (!inputValue) {
      // Si el input está vacío, mostrar todas las unidades
      return unidadesPrevias
    }
    return unidadesPrevias.filter(unidad =>
      unidad.toLowerCase().includes(inputValue)
    )
  }, [unidadesPrevias, newAnalitoData.unidad])

  // Formulario de nueva maquinaria
  const [formData, setFormData] = useState({
    nombre: '',
    modelo: '',
    marca: '',
    serie: '',
    sucursalId: ''
  })

  const canCreateAnalitos = currentUser?.permisos?.includes('catalogo.analitos.crear') ?? false
  const canEditAnalitos = currentUser?.permisos?.includes('catalogo.analitos.editar') ?? false
  const canDeleteAnalitos = currentUser?.permisos?.includes('catalogo.analitos.eliminar') ?? false
  const canCreateCategorias = currentUser?.permisos?.includes('catalogo.categorias.crear') ?? false
  const canEditCategorias = currentUser?.permisos?.includes('catalogo.categorias.editar') ?? false
  const canDeleteCategorias = currentUser?.permisos?.includes('catalogo.categorias.eliminar') ?? false
  const canViewCatalog = currentUser?.permisos?.includes('catalogo.analitos.ver') ?? false

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

      const [maquinariaRes, sucursalesRes, meRes] = await Promise.all([
        fetch('/api/maquinaria', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/sucursales', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const [maquinariaData, sucursalesData, meData] = await Promise.all([
        maquinariaRes.json(),
        sucursalesRes.json(),
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
        permisos: meData.data.permisos || []
      })

      if (maquinariaData.success) setMaquinaria(maquinariaData.data)
      if (sucursalesData.success) setSucursales(sucursalesData.data)

      if ((meData.data.permisos || []).some((permiso: string) =>
        ['catalogo.analitos.ver', 'catalogo.analitos.crear', 'catalogo.categorias.ver', 'catalogo.categorias.crear'].includes(permiso)
      )) {
        await loadCatalogData(meData.data.permisos || [])
      }

    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const loadCatalogData = async (permisosOverride?: string[]) => {
    try {
      setLoadingCatalog(true)
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }

      const permisos = permisosOverride ?? currentUser?.permisos ?? []
      const puedeVerAnalitos = permisos.includes('catalogo.analitos.ver')
      const puedeCrearAnalitos = permisos.includes('catalogo.analitos.crear')
      const puedeVerCategorias = permisos.includes('catalogo.categorias.ver')
      const puedeCrearCategorias = permisos.includes('catalogo.categorias.crear')

      const requests: Promise<Response>[] = []

      if (puedeVerAnalitos || puedeCrearAnalitos) {
        requests.push(fetch('/api/analitos', {
          headers: { 'Authorization': `Bearer ${token}` }
        }))
      }

      if (puedeVerCategorias || puedeCrearCategorias) {
        requests.push(fetch('/api/categorias-analito', {
          headers: { 'Authorization': `Bearer ${token}` }
        }))
      }

      if (requests.length === 0) {
        return
      }

      const responses = await Promise.all(requests)
      const payloads = await Promise.all(responses.map(res => res.json()))

      let analitosPayloadIndex = -1
      let categoriasPayloadIndex = -1

      if (puedeVerAnalitos || puedeCrearAnalitos) {
        analitosPayloadIndex = 0
      }

      if (puedeVerCategorias || puedeCrearCategorias) {
        categoriasPayloadIndex = (puedeVerAnalitos || puedeCrearAnalitos) ? 1 : 0
      }

      if (analitosPayloadIndex >= 0) {
        const analitosData = payloads[analitosPayloadIndex]
        if (analitosData.success) {
          setAnalitos(analitosData.data)
        }
      }

      if (categoriasPayloadIndex >= 0) {
        const categoriasData = payloads[categoriasPayloadIndex]
        if (categoriasData.success) {
          setCategorias(categoriasData.data)
        }
      }
    } catch (error) {
      console.error('Error al cargar catálogo de analitos:', error)
      toast.error('No se pudo cargar el catálogo de parámetros')
    } finally {
      setLoadingCatalog(false)
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

  const handleCreateAnalito = async () => {
    if (!newAnalitoData.nombre.trim()) {
      toast.error('El nombre del parámetro es obligatorio')
      return
    }

    try {
      setCreatingAnalito(true)
      const token = localStorage.getItem('token')
      const url = editingAnalito 
        ? `/api/analitos/${editingAnalito.id}`
        : '/api/analitos'
      const method = editingAnalito ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: newAnalitoData.nombre.trim(),
          unidad: newAnalitoData.unidad.trim() || undefined,
          descripcion: newAnalitoData.descripcion.trim() || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingAnalito ? 'Parámetro actualizado correctamente' : 'Parámetro registrado correctamente')
        
        // Guardar unidad en la lista de previas si existe
        if (newAnalitoData.unidad.trim()) {
          guardarUnidadPrevia(newAnalitoData.unidad.trim())
        }
        
        if (editingAnalito) {
          setAnalitos(prev =>
            prev.map(a => a.id === editingAnalito.id ? data.data : a)
              .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
          )
        } else {
          setAnalitos(prev =>
            [...prev, data.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
          )
        }
        setShowAnalitoModal(false)
        setEditingAnalito(null)
        setNewAnalitoData({
          nombre: '',
          unidad: '',
          descripcion: ''
        })
        setShowUnidadesDropdown(false)
      } else {
        toast.error(data.error || `Error al ${editingAnalito ? 'actualizar' : 'registrar'} parámetro`)
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setCreatingAnalito(false)
    }
  }

  const handleCreateCategoria = async () => {
    if (!newCategoriaData.nombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }

    if (newCategoriaData.analitoIds.length === 0) {
      toast.error('Selecciona al menos un parámetro')
      return
    }

    try {
      setCreatingCategoria(true)
      const token = localStorage.getItem('token')
      const url = editingCategoria 
        ? `/api/categorias-analito/${editingCategoria.id}`
        : '/api/categorias-analito'
      const method = editingCategoria ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: newCategoriaData.nombre.trim(),
          descripcion: newCategoriaData.descripcion.trim() || undefined,
          analitoIds: newCategoriaData.analitoIds
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingCategoria ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente')
        if (editingCategoria) {
          setCategorias(prev =>
            prev.map(cat => cat.id === editingCategoria.id ? data.data : cat)
              .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
          )
        } else {
          setCategorias(prev =>
            [...prev, data.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
          )
        }
        setShowCategoriaModal(false)
        setEditingCategoria(null)
        setNewCategoriaData({
          nombre: '',
          descripcion: '',
          analitoIds: []
        })
      } else {
        toast.error(data.error || `Error al ${editingCategoria ? 'actualizar' : 'crear'} categoría`)
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setCreatingCategoria(false)
    }
  }

  const handleEditAnalito = async (analito: Analito) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/analitos/${analito.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setEditingAnalito(data.data)
        setNewAnalitoData({
          nombre: data.data.nombre,
          unidad: data.data.unidad || '',
          descripcion: data.data.descripcion || ''
        })
        setShowAnalitoModal(true)
      } else {
        toast.error(data.error || 'Error al cargar parámetro')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleEditCategoria = async (categoria: CategoriaAnalito) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/categorias-analito/${categoria.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setEditingCategoria(data.data)
        setNewCategoriaData({
          nombre: data.data.nombre,
          descripcion: data.data.descripcion || '',
          analitoIds: data.data.analitos.map((d: { analito: { id: string } }) => d.analito.id)
        })
        if (analitos.length === 0) {
          void loadCatalogData(currentUser?.permisos || [])
        }
        setShowCategoriaModal(true)
      } else {
        toast.error(data.error || 'Error al cargar categoría')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleDeleteAnalito = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este parámetro?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/analitos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Parámetro eliminado exitosamente')
        setAnalitos(prev => prev.filter(a => a.id !== id))
      } else {
        toast.error(data.error || 'Error al eliminar parámetro')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleDeleteCategoria = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/categorias-analito/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Categoría eliminada exitosamente')
        setCategorias(prev => prev.filter(c => c.id !== id))
      } else {
        toast.error(data.error || 'Error al eliminar categoría')
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
              <h1 className="text-xl font-semibold text-primary">Gestión de Maquinaria</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {canViewCatalog && (
                <button
                  onClick={() => {
                    if (analitos.length === 0 && categorias.length === 0) {
                      void loadCatalogData(currentUser?.permisos || [])
                    }
                    setShowCatalogSection(!showCatalogSection)
                  }}
                  className="btn btn-secondary"
                >
                  <BeakerIcon className="h-5 w-5 mr-2" />
                  {showCatalogSection ? 'Ocultar' : 'Ver'} Catálogo
                </button>
              )}

              {canCreateCategorias && (
                <button
                  onClick={() => {
                    setEditingCategoria(null)
                    if (analitos.length === 0) {
                      void loadCatalogData(currentUser?.permisos || [])
                    }
                    setNewCategoriaData({
                      nombre: '',
                      descripcion: '',
                      analitoIds: []
                    })
                    setShowCategoriaModal(true)
                  }}
                  className="btn btn-secondary"
                >
                  <SquaresPlusIcon className="h-5 w-5 mr-2" />
                  Nueva categoría
                </button>
              )}

              {canCreateAnalitos && (
                <button
                  onClick={() => {
                    setEditingAnalito(null)
                    setNewAnalitoData({
                      nombre: '',
                      unidad: '',
                      descripcion: ''
                    })
                    setShowAnalitoModal(true)
                  }}
                  className="btn btn-secondary"
                >
                  <BeakerIcon className="h-5 w-5 mr-2" />
                  Nuevo parámetro
                </button>
              )}

              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Nueva Maquinaria
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sección de Catálogo */}
        {showCatalogSection && canViewCatalog && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Catálogo Clínico</h2>
              <button
                onClick={() => setShowCatalogSection(false)}
                className="text-tertiary hover:text-secondary"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista de Analitos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-secondary">Parámetros</h3>
                  <span className="text-sm text-tertiary">{analitos.length} registrados</span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {analitos.length === 0 ? (
                    <p className="text-sm text-tertiary text-center py-4">
                      No hay parámetros registrados
                    </p>
                  ) : (
                    analitos.map(analito => (
                      <div
                        key={analito.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-primary">{analito.nombre}</p>
                          {analito.unidad && (
                            <p className="text-xs text-tertiary">Unidad: {analito.unidad}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {canEditAnalitos && (
                            <button
                              onClick={() => handleEditAnalito(analito)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Editar"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canDeleteAnalitos && (
                            <button
                              onClick={() => handleDeleteAnalito(analito.id)}
                              className="text-danger-600 hover:text-danger-900"
                              title="Eliminar"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lista de Categorías */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-secondary">Categorías</h3>
                  <span className="text-sm text-tertiary">{categorias.length} registradas</span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categorias.length === 0 ? (
                    <p className="text-sm text-tertiary text-center py-4">
                      No hay categorías registradas
                    </p>
                  ) : (
                    categorias.map(categoria => (
                      <div
                        key={categoria.id}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-primary">{categoria.nombre}</p>
                            {categoria.descripcion && (
                              <p className="text-xs text-tertiary mt-1">{categoria.descripcion}</p>
                            )}
                            <p className="text-xs text-tertiary mt-1">
                              {categoria.analitos.length} parámetros
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {canEditCategorias && (
                              <button
                                onClick={() => handleEditCategoria(categoria)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Editar"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            )}
                            {canDeleteCategorias && (
                              <button
                                onClick={() => handleDeleteCategoria(categoria.id)}
                                className="text-danger-600 hover:text-danger-900"
                                title="Eliminar"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {categoria.analitos.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-secondary">
                              {categoria.analitos.map(d => d.analito.nombre).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary" />
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
            <div
              key={equipo.id}
              onClick={() => router.push(`/dashboard/maquinaria/${equipo.id}/editar`)}
              className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-warning-100 rounded-lg mr-3">
                    <CpuChipIcon className="h-6 w-6 text-warning-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">
                      {equipo.nombre}
                    </h3>
                    <p className="text-sm text-tertiary">
                      {equipo.marca} {equipo.modelo}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-secondary">
                  <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                  {equipo.sucursal.nombre}
                </div>

                {equipo.serie && (
                  <div className="flex items-center text-sm text-secondary">
                    <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                    Serie: {equipo.serie}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className={`badge ${equipo.activa ? 'badge-success' : 'badge-danger'}`}>
                    {equipo.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMaquinaria.length === 0 && (
          <div className="text-center py-12">
            <CpuChipIcon className="h-12 w-12 text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">
              No se encontró maquinaria
            </h3>
            <p className="text-tertiary">
              {searchTerm || filterSucursal ? 'Intenta con otros filtros' : 'Registra tu primera maquinaria'}
            </p>
          </div>
        )}
      </main>

      {/* Modal Nueva Maquinaria */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-100 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-primary">Nueva Maquinaria</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-tertiary hover:text-secondary"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
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
                    <label className="block text-sm font-medium text-secondary mb-2">
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
                    <label className="block text-sm font-medium text-secondary mb-2">
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
                  <label className="block text-sm font-medium text-secondary mb-2">
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
                  <label className="block text-sm font-medium text-secondary mb-2">
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

      {/* Modal Nuevo Parámetro */}
      {showAnalitoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-100 rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-primary">
                  {editingAnalito ? 'Editar parámetro' : 'Nuevo parámetro'}
                </h2>
                <button
                  onClick={() => {
                    setShowAnalitoModal(false)
                    setEditingAnalito(null)
                    setNewAnalitoData({
                      nombre: '',
                      unidad: '',
                      descripcion: ''
                    })
                  }}
                  className="text-tertiary hover:text-secondary"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Nombre del parámetro"
                    value={newAnalitoData.nombre}
                    onChange={(e) => setNewAnalitoData(prev => ({ ...prev, nombre: e.target.value }))}
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Unidad
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input"
                      placeholder="mg/dL, mmol/L..."
                      value={newAnalitoData.unidad}
                      onChange={(e) => {
                        setNewAnalitoData(prev => ({ ...prev, unidad: e.target.value }))
                        setShowUnidadesDropdown(true)
                      }}
                      onFocus={() => {
                        console.log('[UNIDADES] Input enfocado')
                        console.log('[UNIDADES] Unidades previas totales:', unidadesPrevias.length)
                        console.log('[UNIDADES] Unidades filtradas:', unidadesFiltradas.length)
                        console.log('[UNIDADES] Valor actual del input:', newAnalitoData.unidad)
                        console.log('[UNIDADES] showUnidadesDropdown será:', true)
                        setShowUnidadesDropdown(true)
                      }}
                      onBlur={(e) => {
                        // Delay para permitir click en el dropdown
                        setTimeout(() => {
                          setShowUnidadesDropdown(false)
                        }, 200)
                      }}
                    />
                    {showUnidadesDropdown && unidadesFiltradas.length > 0 && (
                      <div 
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        onMouseDown={(e) => e.preventDefault()} // Prevenir que el blur cierre el dropdown
                      >
                        {unidadesFiltradas.map((unidad, index) => {
                          // Verificar si es una unidad común (no se puede eliminar)
                          const esComun = unidadesComunes.includes(unidad)
                          return (
                          <div
                            key={index}
                            className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer group"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setNewAnalitoData(prev => ({ ...prev, unidad }))
                              setShowUnidadesDropdown(false)
                            }}
                          >
                            <span className="text-sm text-secondary">{unidad}</span>
                            {!esComun && (
                              <button
                                type="button"
                                onClick={(e) => eliminarUnidadPrevia(unidad, e)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                title="Eliminar unidad"
                              >
                                <XMarkIcon className="h-4 w-4 text-red-600" />
                              </button>
                            )}
                          </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Descripción
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Notas u observaciones sobre el parámetro"
                    value={newAnalitoData.descripcion}
                    onChange={(e) => setNewAnalitoData(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAnalitoModal(false)
                      setNewAnalitoData({
                        nombre: '',
                        unidad: '',
                        descripcion: ''
                      })
                    }}
                    className="btn btn-secondary"
                    disabled={creatingAnalito}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAnalito}
                    className="btn btn-primary"
                    disabled={creatingAnalito}
                  >
                    {creatingAnalito ? 'Guardando...' : editingAnalito ? 'Actualizar' : 'Registrar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Categoría */}
      {showCategoriaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-100 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-primary">
                  {editingCategoria ? 'Editar categoría de pruebas' : 'Nueva categoría de pruebas'}
                </h2>
                <button
                  onClick={() => {
                    setShowCategoriaModal(false)
                    setEditingCategoria(null)
                    setNewCategoriaData({
                      nombre: '',
                      descripcion: '',
                      analitoIds: []
                    })
                  }}
                  className="text-tertiary hover:text-secondary"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. Química 6"
                      value={newCategoriaData.nombre}
                      onChange={(e) => setNewCategoriaData(prev => ({ ...prev, nombre: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Descripción
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Descripción breve"
                      value={newCategoriaData.descripcion}
                      onChange={(e) => setNewCategoriaData(prev => ({ ...prev, descripcion: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Orden de selección */}
                {newCategoriaData.analitoIds.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Orden de selección
                    </label>
                    <p className="text-xs text-tertiary mb-3">
                      Arrastra las tarjetas para reordenar. El orden de izquierda a derecha determina cómo se mostrarán en los resultados.
                    </p>
                    <div 
                      className="flex flex-wrap gap-3 p-4 border rounded-lg min-h-[100px]"
                      style={{
                        backgroundColor: 'rgb(var(--color-gray-50))',
                        borderColor: 'rgb(var(--color-gray-200))'
                      }}
                    >
                      {newCategoriaData.analitoIds.map((analitoId, index) => {
                        const analito = analitos.find(a => a.id === analitoId)
                        if (!analito) return null
                        
                        return (
                          <div
                            key={analitoId}
                            draggable
                            onDragStart={(e) => {
                              setDraggedIndex(index)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              if (draggedIndex === null) return
                              
                              const newOrder = [...newCategoriaData.analitoIds]
                              const draggedItem = newOrder[draggedIndex]
                              newOrder.splice(draggedIndex, 1)
                              newOrder.splice(index, 0, draggedItem)
                              
                              setNewCategoriaData(prev => ({
                                ...prev,
                                analitoIds: newOrder
                              }))
                              setDraggedIndex(null)
                            }}
                            onDragEnd={() => {
                              setDraggedIndex(null)
                            }}
                            className="flex items-center gap-2 px-3 py-2 border-2 rounded-lg cursor-move transition-all hover:shadow-md"
                            style={{
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              backgroundColor: 'rgb(var(--color-gray-100))',
                              borderColor: draggedIndex === index 
                                ? 'rgb(var(--color-primary-500))' 
                                : 'rgb(var(--color-gray-300))',
                              opacity: draggedIndex === index ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (draggedIndex !== index) {
                                e.currentTarget.style.borderColor = 'rgb(var(--color-primary-400))'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (draggedIndex !== index) {
                                e.currentTarget.style.borderColor = 'rgb(var(--color-gray-300))'
                              }
                            }}
                            title="Arrastra para reordenar"
                          >
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                              style={{
                                backgroundColor: 'rgb(var(--color-primary-100))',
                                color: 'rgb(var(--color-primary-600))'
                              }}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-secondary">{analito.nombre}</p>
                              {analito.unidad && (
                                <p className="text-xs text-tertiary">Unidad: {analito.unidad}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Parámetros incluidos *
                  </label>

                  {loadingCatalog ? (
                    <div className="text-sm text-tertiary">Cargando parámetros...</div>
                  ) : analitos.length === 0 ? (
                    <p className="text-sm text-tertiary">
                      No hay parámetros registrados todavía. Crea al menos uno para poder formar una categoría.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {analitos.map(analito => {
                        const checked = newCategoriaData.analitoIds.includes(analito.id)
                        return (
                          <label key={analito.id} className="flex items-start gap-2 text-sm text-secondary">
                            <input
                              type="checkbox"
                              className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              checked={checked}
                              onChange={(e) => {
                                setNewCategoriaData(prev => {
                                  if (e.target.checked) {
                                    // Agregar al final para mantener el orden
                                    return {
                                      ...prev,
                                      analitoIds: [...prev.analitoIds, analito.id]
                                    }
                                  } else {
                                    // Remover manteniendo el orden de los demás
                                    return {
                                      ...prev,
                                      analitoIds: prev.analitoIds.filter(id => id !== analito.id)
                                    }
                                  }
                                })
                              }}
                            />
                            <div>
                              <p className="font-medium">{analito.nombre}</p>
                              {analito.unidad && (
                                <p className="text-xs text-tertiary">Unidad: {analito.unidad}</p>
                              )}
                              {analito.descripcion && (
                                <p className="text-xs text-tertiary mt-0.5">{analito.descripcion}</p>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoriaModal(false)
                      setNewCategoriaData({
                        nombre: '',
                        descripcion: '',
                        analitoIds: []
                      })
                    }}
                    className="btn btn-secondary"
                    disabled={creatingCategoria}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCategoria}
                    className="btn btn-primary"
                    disabled={creatingCategoria || analitos.length === 0}
                  >
                    {creatingCategoria ? 'Guardando...' : editingCategoria ? 'Actualizar categoría' : 'Registrar categoría'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
