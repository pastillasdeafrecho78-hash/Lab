'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  BeakerIcon,
  ChevronDownIcon,
  ChevronUpIcon
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

interface FormState {
  nombre: string
  modelo: string
  marca: string
  serie: string
  activa: boolean
}

export default function EditarMaquinariaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maquinaria, setMaquinaria] = useState<MaquinariaDetalle | null>(null)
  const [formData, setFormData] = useState<FormState>({
    nombre: '',
    modelo: '',
    marca: '',
    serie: '',
    activa: true
  })
  const [showCatalog, setShowCatalog] = useState(false)
  const [analitos, setAnalitos] = useState<Analito[]>([])
  const [categorias, setCategorias] = useState<CategoriaAnalito[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [selectedCategorias, setSelectedCategorias] = useState<Set<string>>(new Set())
  const [selectedAnalitos, setSelectedAnalitos] = useState<Set<string>>(new Set())
  const [savingPruebas, setSavingPruebas] = useState(false)

  useEffect(() => {
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

        if (!response.ok || !data.success) {
          toast.error(data.error || 'No se pudo cargar la maquinaria')
          router.push('/dashboard/maquinaria')
          return
        }

        const detalle: MaquinariaDetalle = data.data

        setMaquinaria(detalle)
        setFormData({
          nombre: detalle.nombre,
          modelo: detalle.modelo ?? '',
          marca: detalle.marca ?? '',
          serie: detalle.serie ?? '',
          activa: detalle.activa
        })

        // Cargar selecciones actuales
        const categoriasActuales = new Set<string>()
        const analitosActuales = new Set<string>()
        
        detalle.pruebas.forEach(prueba => {
          prueba.tipoPrueba.categorias.forEach(cat => {
            categoriasActuales.add(cat.categoria.id)
          })
          prueba.tipoPrueba.analitosAsignados.forEach(analito => {
            analitosActuales.add(analito.analito.id)
          })
        })
        
        setSelectedCategorias(categoriasActuales)
        setSelectedAnalitos(analitosActuales)
      } catch (error) {
        toast.error('Error de conexión')
        router.push('/dashboard/maquinaria')
      } finally {
        setLoading(false)
      }
    }

    loadMaquinaria()
  }, [params.id, router])

  const loadCatalogData = async () => {
    try {
      setLoadingCatalog(true)
      const token = getAuthToken()
      if (!token) return

      const headers = getAuthHeaders()

      const [analitosRes, categoriasRes] = await Promise.all([
        fetch('/api/analitos', { headers }),
        fetch('/api/categorias-analito', { headers })
      ])

      const analitosData = await analitosRes.json()
      const categoriasData = await categoriasRes.json()

      if (analitosData.success) {
        setAnalitos(analitosData.data)
      }
      if (categoriasData.success) {
        setCategorias(categoriasData.data)
      }
    } catch (error) {
      console.error('Error al cargar catálogo:', error)
    } finally {
      setLoadingCatalog(false)
    }
  }

  const toggleCategoria = (categoriaId: string) => {
    setSelectedCategorias(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(categoriaId)) {
        nuevo.delete(categoriaId)
        // Deseleccionar todos los analitos de esta categoría
        const categoria = categorias.find(c => c.id === categoriaId)
        if (categoria) {
          categoria.analitos.forEach(detalle => {
            setSelectedAnalitos(prevAnalitos => {
              const nuevoAnalitos = new Set(prevAnalitos)
              nuevoAnalitos.delete(detalle.analito.id)
              return nuevoAnalitos
            })
          })
        }
      } else {
        nuevo.add(categoriaId)
        // Seleccionar todos los analitos de esta categoría
        const categoria = categorias.find(c => c.id === categoriaId)
        if (categoria) {
          categoria.analitos.forEach(detalle => {
            setSelectedAnalitos(prevAnalitos => {
              const nuevoAnalitos = new Set(prevAnalitos)
              nuevoAnalitos.add(detalle.analito.id)
              return nuevoAnalitos
            })
          })
        }
      }
      return nuevo
    })
  }

  const toggleAnalito = (analitoId: string) => {
    setSelectedAnalitos(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(analitoId)) {
        nuevo.delete(analitoId)
      } else {
        nuevo.add(analitoId)
      }
      
      // Verificar si todos los analitos de una categoría están seleccionados
      // y actualizar la selección de categorías automáticamente
      setSelectedCategorias(prevCats => {
        const nuevoCats = new Set(prevCats)
        
        categorias.forEach(categoria => {
          const analitosDeCategoria = categoria.analitos.map(d => d.analito.id)
          if (analitosDeCategoria.length === 0) return
          
          const todosSeleccionados = analitosDeCategoria.every(id => nuevo.has(id))
          const algunoSeleccionado = analitosDeCategoria.some(id => nuevo.has(id))
          
          if (todosSeleccionados) {
            // Si todos los parámetros están seleccionados, seleccionar la categoría automáticamente
            nuevoCats.add(categoria.id)
          } else if (!algunoSeleccionado) {
            // Si ningún parámetro está seleccionado, deseleccionar la categoría
            nuevoCats.delete(categoria.id)
          }
          // Si algunos pero no todos están seleccionados, mantener el estado actual de la categoría
        })
        
        return nuevoCats
      })
      
      return nuevo
    })
  }

  const handleSavePruebas = async () => {
    if (selectedCategorias.size === 0 && selectedAnalitos.size === 0) {
      toast.error('Selecciona al menos una categoría o parámetro')
      return
    }

    try {
      setSavingPruebas(true)
      const token = getAuthToken()
      if (!token) {
        router.push('/')
        return
      }

      const authHeaders = getAuthHeaders()
      const headers: Record<string, string> = {}
      if (authHeaders instanceof Headers) {
        authHeaders.forEach((value, key) => {
          headers[key] = value
        })
      } else if (Array.isArray(authHeaders)) {
        authHeaders.forEach(([key, value]) => {
          headers[key] = value
        })
      } else {
        Object.assign(headers, authHeaders)
      }
      headers['Content-Type'] = 'application/json'

      // Crear o encontrar TipoPrueba con las selecciones
      const response = await fetch('/api/tipos-prueba', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nombre: `${maquinaria?.nombre} - Prueba personalizada`,
          descripcion: `Prueba asignada a ${maquinaria?.nombre}`,
          categoriaIds: Array.from(selectedCategorias),
          analitoIds: Array.from(selectedAnalitos)
        })
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error || 'Error al crear tipo de prueba')
        return
      }

      // Asignar el TipoPrueba a la maquinaria
      const asignarResponse = await fetch(`/api/maquinaria/${params.id}/pruebas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipoPruebaId: data.data.id
        })
      })

      const asignarData = await asignarResponse.json()

      if (!asignarData.success) {
        toast.error(asignarData.error || 'Error al asignar prueba')
        return
      }

      toast.success('Pruebas asignadas correctamente')
      // Recargar datos
      window.location.reload()
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSavingPruebas(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      setSaving(true)
      const token = getAuthToken()
      if (!token) {
        router.push('/')
        return
      }

      const authHeaders = getAuthHeaders()
      const headers: Record<string, string> = {}
      if (authHeaders instanceof Headers) {
        authHeaders.forEach((value, key) => {
          headers[key] = value
        })
      } else if (Array.isArray(authHeaders)) {
        authHeaders.forEach(([key, value]) => {
          headers[key] = value
        })
      } else {
        Object.assign(headers, authHeaders)
      }
      headers['Content-Type'] = 'application/json'

      const response = await fetch(`/api/maquinaria/${params.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          modelo: formData.modelo.trim() || null,
          marca: formData.marca.trim() || null,
          serie: formData.serie.trim() || null,
          activa: formData.activa
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        toast.error(data.error || 'No se pudo actualizar la maquinaria')
        return
      }

      toast.success('Maquinaria actualizada correctamente')
      router.push('/dashboard/maquinaria')
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
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
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-100 shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/maquinaria')}
                className="mr-4 p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Editar Maquinaria</h1>
                <p className="text-sm text-gray-500">
                  {maquinaria.nombre} · {maquinaria.sucursal.nombre}
                </p>
              </div>
            </div>
            <span className={`badge ${formData.activa ? 'badge-success' : 'badge-danger'}`}>
              {formData.activa ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Información General y Sucursal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información general</h2>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={formData.marca}
                      onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                      className="input"
                      placeholder="Marca comercial"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de serie
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, activa: true }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                          formData.activa
                            ? 'border-success-500 bg-success-50 text-success-700'
                            : 'border-gray-300 text-gray-500 hover:border-success-300'
                        }`}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Activa
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, activa: false }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                          !formData.activa
                            ? 'border-danger-500 bg-danger-50 text-danger-700'
                            : 'border-gray-300 text-gray-500 hover:border-danger-300'
                        }`}
                      >
                        <XCircleIcon className="h-5 w-5" />
                        Inactiva
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/maquinaria')}
                    className="btn btn-secondary"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sucursal asignada</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p className="font-medium text-gray-900">{maquinaria.sucursal.nombre}</p>
                {maquinaria.sucursal.direccion && (
                  <p>{maquinaria.sucursal.direccion}</p>
                )}
                {maquinaria.sucursal.telefono && (
                  <p>Tel: {maquinaria.sucursal.telefono}</p>
                )}
              </div>
            </div>
          </div>

          {/* Catálogo Clínico - Asignar nuevas pruebas */}
          <div className="card">
            <button
              onClick={() => {
                if (!showCatalog) {
                  loadCatalogData()
                }
                setShowCatalog(!showCatalog)
              }}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <BeakerIcon className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Asignar Pruebas</h2>
              </div>
              {showCatalog ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>

            {showCatalog && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {loadingCatalog ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando catálogo...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Categorías disponibles para asignar */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-md font-medium text-gray-700">Categorías</h3>
                          <span className="text-sm text-gray-500">{categorias.length} disponibles</span>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {categorias.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No hay categorías disponibles
                            </p>
                          ) : (
                            categorias.map(categoria => {
                              const isSelected = selectedCategorias.has(categoria.id)
                              const analitosDeCategoria = categoria.analitos.map(d => d.analito.id)
                              const todosSeleccionados = analitosDeCategoria.length > 0 && 
                                analitosDeCategoria.every(id => selectedAnalitos.has(id))
                              
                              return (
                                <label
                                  key={categoria.id}
                                  className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition ${
                                    isSelected || todosSeleccionados
                                      ? 'border-primary-500 bg-primary-50'
                                      : 'border-gray-200 bg-gray-100 hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    checked={isSelected || todosSeleccionados}
                                    onChange={() => toggleCategoria(categoria.id)}
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{categoria.nombre}</p>
                                    {categoria.descripcion && (
                                      <p className="text-xs text-gray-500 mt-1">{categoria.descripcion}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      {categoria.analitos.length} parámetros
                                    </p>
                                  </div>
                                </label>
                              )
                            })
                          )}
                        </div>
                      </div>

                      {/* Parámetros disponibles para asignar */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-md font-medium text-gray-700">Parámetros</h3>
                          <span className="text-sm text-gray-500">{analitos.length} disponibles</span>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {analitos.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No hay parámetros disponibles
                            </p>
                          ) : (
                            analitos.map(analito => {
                              const isSelected = selectedAnalitos.has(analito.id)
                              
                              return (
                                <label
                                  key={analito.id}
                                  className={`flex items-start gap-2 p-2 rounded text-sm cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-primary-50 text-primary-900'
                                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    checked={isSelected}
                                    onChange={() => toggleAnalito(analito.id)}
                                  />
                                  <div className="flex-1">
                                    <span className="font-medium">{analito.nombre}</span>
                                    {analito.unidad && (
                                      <span className="text-gray-500 ml-2">({analito.unidad})</span>
                                    )}
                                  </div>
                                </label>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botón para guardar asignaciones */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSavePruebas}
                        disabled={savingPruebas || (selectedCategorias.size === 0 && selectedAnalitos.size === 0)}
                        className="btn btn-primary"
                      >
                        {savingPruebas ? 'Guardando...' : 'Asignar Pruebas Seleccionadas'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

