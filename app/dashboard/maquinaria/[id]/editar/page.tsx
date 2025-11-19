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
      elementos: string[]
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

  useEffect(() => {
    const loadMaquinaria = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/')
          return
        }

        const response = await fetch(`/api/maquinaria/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
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
      const token = localStorage.getItem('token')
      if (!token) return

      const [analitosRes, categoriasRes] = await Promise.all([
        fetch('/api/analitos', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/categorias-analito', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/maquinaria/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!maquinaria) {
    return null
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard/maquinaria')}
                className="mr-4 p-2 rounded-lg bg-secondary-50 text-secondary-700 hover:bg-secondary-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-secondary-900">Editar Maquinaria</h1>
                <p className="text-sm text-secondary-500">
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
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Información general</h2>

              <form className="space-y-6" onSubmit={handleSubmit}>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
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
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Estado
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, activa: true }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                          formData.activa
                            ? 'border-success-500 bg-success-50 text-success-700'
                            : 'border-secondary-300 text-secondary-500 hover:border-success-300'
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
                            : 'border-secondary-300 text-secondary-500 hover:border-danger-300'
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
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Sucursal asignada</h2>
              <div className="space-y-2 text-sm text-secondary-600">
                <p className="font-medium text-secondary-900">{maquinaria.sucursal.nombre}</p>
                {maquinaria.sucursal.direccion && (
                  <p>{maquinaria.sucursal.direccion}</p>
                )}
                {maquinaria.sucursal.telefono && (
                  <p>Tel: {maquinaria.sucursal.telefono}</p>
                )}
              </div>
            </div>
          </div>

          {/* Catálogo Clínico - Sección expandible */}
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
                <BeakerIcon className="h-5 w-5 text-secondary-500" />
                <h2 className="text-lg font-semibold text-secondary-900">Catálogo Clínico</h2>
              </div>
              {showCatalog ? (
                <ChevronUpIcon className="h-5 w-5 text-secondary-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-secondary-500" />
              )}
            </button>

            {showCatalog && (
              <div className="mt-4 pt-4 border-t border-secondary-200">
                {loadingCatalog ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-secondary-500 mt-2">Cargando catálogo...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lista de Analitos */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-md font-medium text-secondary-700">Parámetros</h3>
                        <span className="text-sm text-secondary-500">{analitos.length} registrados</span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {analitos.length === 0 ? (
                          <p className="text-sm text-secondary-500 text-center py-4">
                            No hay parámetros registrados
                          </p>
                        ) : (
                          analitos.map(analito => (
                            <div
                              key={analito.id}
                              className="p-2 bg-secondary-50 rounded text-sm text-secondary-700"
                            >
                              <span className="font-medium">{analito.nombre}</span>
                              {analito.unidad && (
                                <span className="text-secondary-500 ml-2">({analito.unidad})</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Lista de Categorías */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-md font-medium text-secondary-700">Categorías</h3>
                        <span className="text-sm text-secondary-500">{categorias.length} registradas</span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {categorias.length === 0 ? (
                          <p className="text-sm text-secondary-500 text-center py-4">
                            No hay categorías registradas
                          </p>
                        ) : (
                          categorias.map(categoria => (
                            <div
                              key={categoria.id}
                              className="p-2 bg-secondary-50 rounded"
                            >
                              <p className="text-sm font-medium text-secondary-900">{categoria.nombre}</p>
                              {categoria.descripcion && (
                                <p className="text-xs text-secondary-500 mt-1">{categoria.descripcion}</p>
                              )}
                              <p className="text-xs text-secondary-400 mt-1">
                                {categoria.analitos.length} parámetros
                              </p>
                            </div>
                          ))
                        )}
                      </div>
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

