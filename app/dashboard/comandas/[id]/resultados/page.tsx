'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon
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
  elementos: string[]
  cliente: {
    id: string
    nombre: string
    apellido: string
  }
  sucursal: {
    id: string
    nombre: string
  }
  tipoPrueba: {
    id: string
    nombre: string
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

export default function ResultadosPage({ params }: { params: { id: string } }) {
  const [comanda, setComanda] = useState<Comanda | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingResultado, setEditingResultado] = useState<string | null>(null)
  const [unidadesPrevias, setUnidadesPrevias] = useState<string[]>([])
  const [categorias, setCategorias] = useState<CategoriaAnalito[]>([])
  const [analitos, setAnalitos] = useState<Analito[]>([])
  const [busquedaElemento, setBusquedaElemento] = useState('')
  const router = useRouter()

  // Cargar unidades previas desde localStorage
  useEffect(() => {
    const stored = localStorage.getItem('unidades_previas')
    if (stored) {
      try {
        const unidades = JSON.parse(stored)
        setUnidadesPrevias(unidades)
      } catch (error) {
        console.error('Error al cargar unidades previas:', error)
      }
    }
  }, [])

  // Guardar unidad en la lista de previas
  const guardarUnidadPrevia = (unidad: string) => {
    if (!unidad || !unidad.trim()) return
    
    const unidadTrimmed = unidad.trim()
    setUnidadesPrevias(prev => {
      // Evitar duplicados y mantener orden (más recientes primero)
      const nuevas = [unidadTrimmed, ...prev.filter(u => u !== unidadTrimmed)]
      // Limitar a 20 unidades
      const limitadas = nuevas.slice(0, 20)
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
  const unidadesFiltradas = (unidadActual: string) => {
    return unidadesPrevias.filter(unidad =>
      unidad.toLowerCase().includes(unidadActual.toLowerCase())
    )
  }

  // Formulario de resultados directo
  const [resultadosForm, setResultadosForm] = useState<Record<string, {
    valor: string
    unidad: string
    rangoNormal: string
    observaciones: string
  }>>({})

  useEffect(() => {
    loadComanda()
    loadCatalogData()
  }, [params.id])

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

      if (categoriasData.success) {
        setCategorias(categoriasData.data)
        console.log('[RESULTADOS] Categorías cargadas:', categoriasData.data.map((c: any) => ({
          nombre: c.nombre,
          analitos: c.analitos.map((d: any) => d.analito.nombre)
        })))
      }
      if (analitosData.success) {
        setAnalitos(analitosData.data)
        console.log('[RESULTADOS] Analitos cargados:', analitosData.data.map((a: any) => a.nombre))
      }
    } catch (error) {
      console.error('Error al cargar catálogo:', error)
    }
  }

  // Obtener información del analito por nombre
  const getAnalitoInfo = (nombre: string) => {
    return analitos.find(a => a.nombre === nombre)
  }

  // Obtener categoría de un analito
  const getCategoriaDeAnalito = (nombreAnalito: string) => {
    const categoria = categorias.find(cat => 
      cat.analitos.some(detalle => detalle.analito.nombre === nombreAnalito)
    )
    return categoria
  }

  // Obtener categoría que contiene los elementos de la comanda
  // Siempre busca la categoría con mayor cantidad de elementos coincidentes
  const getCategoriaDelTipoPrueba = () => {
    if (!comanda || categorias.length === 0 || comanda.elementos.length === 0) {
      return null
    }
    
    // Buscar la categoría con mayor cantidad de elementos coincidentes
    let mejorCategoria = null
    let maxElementos = 0
    
    for (const categoria of categorias) {
      const elementosDeCategoria = categoria.analitos.map(d => d.analito.nombre)
      const elementosEncontrados = comanda.elementos.filter(elemento => 
        elementosDeCategoria.includes(elemento)
      )
      
      // Si esta categoría tiene más elementos coincidentes, es la mejor
      if (elementosEncontrados.length > maxElementos) {
        maxElementos = elementosEncontrados.length
        mejorCategoria = categoria
      }
    }
    
    // Solo retornar la categoría si tiene al menos un elemento coincidente
    // Si se pierde un elemento y ya no hay coincidencias, retornar null
    if (mejorCategoria && maxElementos > 0) {
      return mejorCategoria
    }
    
    return null
  }

  // Obtener elementos agrupados por categoría
  const getElementosPorCategoria = () => {
    if (!comanda) return []
    
    let elementosFiltrados = comanda.elementos
    let categoria = null
    
    // Si hay búsqueda, buscar por nombre de elemento o por categoría
    if (busquedaElemento.trim()) {
      const busquedaLower = busquedaElemento.toLowerCase()
      
      // Primero buscar si coincide con alguna categoría
      const categoriaEncontrada = categorias.find(c => 
        c.nombre.toLowerCase().includes(busquedaLower) ||
        busquedaLower.includes(c.nombre.toLowerCase())
      )
      
      if (categoriaEncontrada) {
        // Si se encontró una categoría, mostrar todos los elementos de esa categoría que estén en la comanda
        const elementosDeCategoria = categoriaEncontrada.analitos.map(d => d.analito.nombre)
        elementosFiltrados = comanda.elementos.filter(e => 
          elementosDeCategoria.includes(e)
        )
        categoria = categoriaEncontrada
      } else {
        // Si no se encontró categoría, buscar por nombre de elemento
        elementosFiltrados = comanda.elementos.filter(e => 
          e.toLowerCase().includes(busquedaLower)
        )
        
        // Buscar la mejor categoría para los elementos filtrados
        if (elementosFiltrados.length > 0) {
          let mejorCategoria = null
          let maxElementos = 0
          
          for (const cat of categorias) {
            const elementosDeCategoria = cat.analitos.map(d => d.analito.nombre)
            const elementosEncontrados = elementosFiltrados.filter(e => 
              elementosDeCategoria.includes(e)
            )
            
            if (elementosEncontrados.length > maxElementos) {
              maxElementos = elementosEncontrados.length
              mejorCategoria = cat
            }
          }
          
          // Solo mostrar categoría si tiene al menos un elemento coincidente
          if (mejorCategoria && maxElementos > 0) {
            categoria = mejorCategoria
          }
        }
      }
    } else {
      // Sin búsqueda, usar la categoría de todos los elementos
      categoria = getCategoriaDelTipoPrueba()
    }
    
    // Si no hay elementos filtrados, no mostrar categoría
    if (elementosFiltrados.length === 0) {
      categoria = null
    }
    
    return [{
      categoria: categoria,
      elementos: elementosFiltrados
    }]
  }

  const initializeResultadosForm = (comandaData: Comanda) => {
    const formData: Record<string, {
      valor: string
      unidad: string
      rangoNormal: string
      observaciones: string
    }> = {}
    
    comandaData.elementos.forEach(elemento => {
      const resultadoExistente = comandaData.resultados.find(r => r.elemento === elemento)
      const analitoInfo = getAnalitoInfo(elemento)
      
      if (resultadoExistente) {
        formData[elemento] = {
          valor: resultadoExistente.valor.toString(),
          unidad: resultadoExistente.unidad,
          rangoNormal: resultadoExistente.rangoNormal,
          observaciones: resultadoExistente.observaciones || ''
        }
      } else {
        formData[elemento] = {
          valor: '',
          unidad: analitoInfo?.unidad || '',
          rangoNormal: '',
          observaciones: ''
        }
      }
    })
    
    setResultadosForm(formData)
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
        console.log('[RESULTADOS] Comanda cargada:', {
          numeroComanda: data.data.numeroComanda,
          tipoPrueba: data.data.tipoPrueba.nombre,
          elementos: data.data.elementos,
          resultadosCount: data.data.resultados.length
        })
        initializeResultadosForm(data.data)
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


  const handleDelete = async (resultadoId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este resultado?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/resultados/${resultadoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Resultado eliminado exitosamente')
        loadComanda()
      } else {
        toast.error(data.error || 'Error al eliminar resultado')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/comandas/${params.id}/pdf?tipo=resultados`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `resultados_${comanda?.numeroComanda}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('PDF descargado exitosamente')
      } else {
        toast.error('Error al generar PDF')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const getElementosSinResultado = () => {
    if (!comanda) return []
    return comanda.elementos.filter(elemento => 
      !comanda.resultados.some(resultado => resultado.elemento === elemento)
    )
  }

  // Enviar resultados
  const handleSubmitResultados = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    const resultadosValidos = Object.entries(resultadosForm)
      .filter(([elemento, data]) => data.valor && data.unidad && data.rangoNormal)
      .map(([elemento, data]) => ({
        elemento,
        valor: parseFloat(data.valor),
        unidad: data.unidad,
        rangoNormal: data.rangoNormal,
        observaciones: data.observaciones
      }))

    if (resultadosValidos.length === 0) {
      toast.error('Por favor completa al menos un resultado')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/comandas/${params.id}/resultados`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resultados: resultadosValidos })
      })

      const data = await response.json()

      if (data.success) {
        // Guardar unidades en la lista de previas
        resultadosValidos.forEach(r => {
          if (r.unidad.trim()) {
            guardarUnidadPrevia(r.unidad.trim())
          }
        })
        
        toast.success(`${data.data.resultadosCreados || resultadosValidos.length} resultados registrados exitosamente`)
        if (data.data.comandaCompletada) {
          toast.success('¡Comanda completada!')
        }
        loadComanda()
      } else {
        toast.error(data.error || 'Error al registrar resultados')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const isValorNormal = (valor: number, rangoNormal: string) => {
    const rangoMatch = rangoNormal.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/)
    if (rangoMatch) {
      const min = parseFloat(rangoMatch[1])
      const max = parseFloat(rangoMatch[2])
      return valor >= min && valor <= max
    }
    return true
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!comanda) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">Comanda no encontrada</h2>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-100 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/dashboard/comandas/${params.id}`)}
                className="mr-4 p-2 rounded-lg bg-gray-50 text-secondary hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-primary">
                  Resultados - {comanda.numeroComanda}
                </h1>
                <p className="text-sm text-tertiary">
                  {comanda.cliente.nombre} {comanda.cliente.apellido}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleSubmitResultados()}
                className="btn btn-primary"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Agregar Resultados
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información de la comanda */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-tertiary">Tipo de Prueba</label>
              <p className="text-primary">{comanda.tipoPrueba.nombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-tertiary">Sucursal</label>
              <p className="text-primary">{comanda.sucursal.nombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-tertiary">Estado</label>
              <p className="text-primary">{comanda.estado.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Formulario de Resultados */}
        {getElementosSinResultado().length > 0 && (
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-primary">
                Ingresar Resultados
              </h3>
            </div>
            <form onSubmit={handleSubmitResultados} className="p-6">
              {/* Barra de búsqueda */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-secondary mb-2">
                  Buscar Elemento
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre de elemento..."
                    value={busquedaElemento}
                    onChange={(e) => setBusquedaElemento(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              {getElementosPorCategoria().map((grupo, grupoIndex) => (
                <div key={grupoIndex} className="mb-6">
                  {/* Tipo de Prueba / Categoría */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-tertiary mb-2">
                      Tipo de Prueba
                    </label>
                    <p className="text-lg font-semibold text-primary">
                      {comanda.tipoPrueba.nombre}
                    </p>
                  </div>

                  {/* Categoría */}
                  {grupo.categoria && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-tertiary mb-2">
                        Categoría
                      </label>
                      <p className="text-lg font-semibold text-primary">
                        {grupo.categoria.nombre}
                      </p>
                    </div>
                  )}

                  {/* Elementos a Analizar */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary mb-3">
                      Elementos a Analizar ({grupo.elementos.length})
                    </label>
                    <div className="space-y-4">
                      {grupo.elementos.map((elemento) => {
                        const analitoInfo = getAnalitoInfo(elemento)
                        const resultadoExistente = comanda.resultados.find(r => r.elemento === elemento)
                        const formData = resultadosForm[elemento] || {
                          valor: resultadoExistente?.valor.toString() || '',
                          unidad: resultadoExistente?.unidad || analitoInfo?.unidad || '',
                          rangoNormal: resultadoExistente?.rangoNormal || '',
                          observaciones: resultadoExistente?.observaciones || ''
                        }
                        
                        return (
                          <div key={elemento} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-primary">
                                {elemento.replace('_', ' ')}
                              </h4>
                              {resultadoExistente && (
                                <span className="badge badge-success text-xs">Registrado</span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-2">
                                  Valor *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.valor}
                                  onChange={(e) => {
                                    setResultadosForm(prev => ({
                                      ...prev,
                                      [elemento]: {
                                        ...prev[elemento],
                                        valor: e.target.value
                                      }
                                    }))
                                  }}
                                  className="input"
                                  required
                                />
                              </div>

                              <div className="relative">
                                <label className="block text-sm font-medium text-secondary mb-2">
                                  Unidad *
                                </label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={formData.unidad}
                                    onChange={(e) => {
                                      setResultadosForm(prev => ({
                                        ...prev,
                                        [elemento]: {
                                          ...prev[elemento],
                                          unidad: e.target.value
                                        }
                                      }))
                                    }}
                                    className="input"
                                    placeholder="mg/dL"
                                    required
                                  />
                                  {/* Dropdown de unidades previas */}
                                  {unidadesPrevias.filter(u => 
                                    u.toLowerCase().includes(formData.unidad.toLowerCase())
                                  ).length > 0 && formData.unidad && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                      {unidadesPrevias.filter(u => 
                                        u.toLowerCase().includes(formData.unidad.toLowerCase())
                                      ).map((unidad, unidadIndex) => (
                                        <div
                                          key={unidadIndex}
                                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer group"
                                          onMouseDown={(e) => {
                                            e.preventDefault()
                                            setResultadosForm(prev => ({
                                              ...prev,
                                              [elemento]: {
                                                ...prev[elemento],
                                                unidad: unidad
                                              }
                                            }))
                                          }}
                                        >
                                          <span className="text-sm text-secondary">{unidad}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => eliminarUnidadPrevia(unidad, e)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                            title="Eliminar unidad"
                                          >
                                            <XMarkIcon className="h-4 w-4 text-red-600" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-secondary mb-2">
                                  Rango Normal *
                                </label>
                                <input
                                  type="text"
                                  value={formData.rangoNormal}
                                  onChange={(e) => {
                                    setResultadosForm(prev => ({
                                      ...prev,
                                      [elemento]: {
                                        ...prev[elemento],
                                        rangoNormal: e.target.value
                                      }
                                    }))
                                  }}
                                  className="input"
                                  placeholder="70 - 100"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-secondary mb-2">
                                  Observaciones
                                </label>
                                <input
                                  type="text"
                                  value={formData.observaciones}
                                  onChange={(e) => {
                                    setResultadosForm(prev => ({
                                      ...prev,
                                      [elemento]: {
                                        ...prev[elemento],
                                        observaciones: e.target.value
                                      }
                                    }))
                                  }}
                                  className="input"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </form>
          </div>
        )}

        {/* Resultados Registrados */}
        {comanda.resultados.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-primary">
                Resultados Registrados ({comanda.resultados.length}/{comanda.elementos.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                      Elemento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                      Rango Normal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                      Registrado Por
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-100 divide-y divide-secondary-200">
                  {comanda.resultados.map((resultado) => {
                    const isNormal = isValorNormal(resultado.valor, resultado.rangoNormal)
                    return (
                      <tr key={resultado.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                          {resultado.elemento.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                          {resultado.valor} {resultado.unidad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-tertiary">
                          {resultado.rangoNormal}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${isNormal ? 'badge-success' : 'badge-danger'}`}>
                            {isNormal ? 'Normal' : 'Fuera de Rango'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-tertiary">
                          {resultado.registradoPor.nombre} {resultado.registradoPor.apellido}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDelete(resultado.id)}
                              className="text-danger-600 hover:text-danger-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
