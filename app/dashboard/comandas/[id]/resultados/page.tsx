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
  FunnelIcon,
  PrinterIcon,
  DocumentTextIcon
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
    direccion?: string
    telefono?: string
    email?: string | null
  }
  tipoPrueba: {
    id: string
    nombre: string
    categorias?: Array<{
      categoria: {
        id: string
        nombre: string
        descripcion?: string | null
      }
    }>
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
  const [dropdownsAbiertos, setDropdownsAbiertos] = useState<Record<string, boolean>>({})
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

  // Función para obtener el nombre completo de una categoría
  const getNombreCompletoCategoria = (nombreCategoria: string, categoriaId?: string) => {
    // Mapeo de abreviaciones comunes a nombres completos
    const mapeoAbreviaciones: Record<string, string> = {
      'QS-6': 'Química Completa 6',
      'QS-5': 'Química Completa 5',
      'QS-3': 'Química Básica 3',
      'HEM': 'Hematología Completa',
      'HEP': 'Perfil Hepático',
      'REN': 'Perfil Renal',
      'ELE': 'Electrolitos',
      'TIR': 'Perfil Tiroideo'
    }
    
    // Si hay un mapeo directo, usarlo
    if (mapeoAbreviaciones[nombreCategoria]) {
      return mapeoAbreviaciones[nombreCategoria]
    }
    
    // Buscar en las categorías cargadas una que coincida mejor
    if (categoriaId) {
      const categoriaCompleta = categorias.find(c => c.id === categoriaId)
      if (categoriaCompleta && categoriaCompleta.nombre.length > nombreCategoria.length) {
        return categoriaCompleta.nombre
      }
    }
    
    return nombreCategoria
  }

  // Obtener categoría de un analito
  const getCategoriaDeAnalito = (nombreAnalito: string) => {
    const categoria = categorias.find(cat => 
      cat.analitos.some(detalle => detalle.analito.nombre === nombreAnalito)
    )
    return categoria
  }

  // Funciones para mostrar el estado con badge y color
  const getEstadoBadge = (estado: string) => {
    const badges = {
      PENDIENTE: 'badge-warning',
      EN_PROCESO: 'badge-primary',
      COMPLETADA: 'badge-success',
      ENTREGADA: 'badge-secondary'
    }
    return badges[estado as keyof typeof badges] || 'badge-secondary'
  }

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      PENDIENTE: 'Registrada',
      EN_PROCESO: 'En Proceso',
      COMPLETADA: 'Finalizada',
      ENTREGADA: 'Entregada'
    }
    return labels[estado] || estado.replace('_', ' ')
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

  // Ordenar elementos según el orden de la categoría
  const ordenarElementosPorCategoria = (elementos: string[], categoria: CategoriaAnalito | null): string[] => {
    if (!categoria || categoria.analitos.length === 0) {
      return elementos
    }
    
    // Crear un mapa del orden de cada analito en la categoría
    const ordenMap = new Map<string, number>()
    categoria.analitos.forEach((detalle, index) => {
      ordenMap.set(detalle.analito.nombre, detalle.orden)
    })
    
    // Ordenar elementos según el orden de la categoría
    // Los elementos que no están en la categoría van al final
    return [...elementos].sort((a, b) => {
      const ordenA = ordenMap.get(a) ?? Infinity
      const ordenB = ordenMap.get(b) ?? Infinity
      return ordenA - ordenB
    })
  }

  // Obtener elementos agrupados por categoría
  const getElementosPorCategoria = () => {
    // Bug 1: Fallback cuando categorias está vacío (similar al componente padre)
    if (!comanda) return []
    if (categorias.length === 0) {
      // Si hay búsqueda, filtrar por texto
      if (busquedaElemento.trim()) {
        const busquedaLower = busquedaElemento.toLowerCase()
        const elementosFiltrados = comanda.elementos.filter(e => 
          e.toLowerCase().includes(busquedaLower)
        )
        return [{
          categoria: null,
          elementos: elementosFiltrados
        }]
      }
      return [{
        categoria: null,
        elementos: comanda.elementos
      }]
    }
    
    const grupos: Array<{ categoria: CategoriaAnalito | null, elementos: string[] }> = []

    // Si hay búsqueda por nombre de categoría, mostrar solo esa categoría
    if (busquedaElemento.trim()) {
      const busquedaLower = busquedaElemento.toLowerCase()
      const categoriaEncontrada = categorias.find(c => 
        c.nombre.toLowerCase().includes(busquedaLower) ||
        busquedaLower.includes(c.nombre.toLowerCase())
      )
      
      if (categoriaEncontrada) {
        // Bug 2: Cuando se encuentra una categoría, usar TODOS los elementos de la comanda
        // (no los filtrados por nombre) y luego filtrar por membresía de categoría
        const elementosDeCategoria = categoriaEncontrada.analitos.map(d => d.analito.nombre)
        const elementosEnCategoria = comanda.elementos.filter(e => 
          elementosDeCategoria.includes(e)
        )
        const elementosOtros = comanda.elementos.filter(e => 
          !elementosDeCategoria.includes(e)
        )
        
        if (elementosEnCategoria.length > 0) {
          grupos.push({
            categoria: categoriaEncontrada,
            elementos: ordenarElementosPorCategoria(elementosEnCategoria, categoriaEncontrada)
          })
        }
        if (elementosOtros.length > 0) {
          grupos.push({
            categoria: null,
            elementos: elementosOtros
          })
        }
        return grupos
      }
    }
    
    // Si hay búsqueda por nombre de elemento (pero no por categoría), filtrar por texto
    let elementosABuscar = comanda.elementos
    if (busquedaElemento.trim()) {
      const busquedaLower = busquedaElemento.toLowerCase()
      elementosABuscar = comanda.elementos.filter(e => 
        e.toLowerCase().includes(busquedaLower)
      )
    }

    // Encontrar la categoría con MAYOR compatibilidad (más elementos coincidentes)
    let mejorCategoria: CategoriaAnalito | null = null
    let maxCoincidencias = 0
    let elementosEnMejorCategoria: string[] = []

    for (const categoria of categorias) {
      const elementosDeCategoria = categoria.analitos.map(d => d.analito.nombre)
      const elementosCoincidentes = elementosABuscar.filter(e => 
        elementosDeCategoria.includes(e)
      )
      
      // Solo considerar categorías que tienen al menos un elemento coincidente
      // Y que tienen más coincidencias que la mejor encontrada hasta ahora
      if (elementosCoincidentes.length > maxCoincidencias) {
        maxCoincidencias = elementosCoincidentes.length
        mejorCategoria = categoria
        elementosEnMejorCategoria = elementosCoincidentes
      }
    }

    // Si encontramos una categoría con elementos coincidentes, mostrarla
    if (mejorCategoria && elementosEnMejorCategoria.length > 0) {
      grupos.push({
        categoria: mejorCategoria,
        elementos: ordenarElementosPorCategoria(elementosEnMejorCategoria, mejorCategoria)
      })

      // Elementos que no están en la mejor categoría van a "Otros"
      const elementosOtros = elementosABuscar.filter(e => !elementosEnMejorCategoria.includes(e))
      if (elementosOtros.length > 0) {
        grupos.push({
          categoria: null,
          elementos: elementosOtros
        })
      }
    } else {
      // Si no hay ninguna categoría que coincida, todos van a "Otros"
      grupos.push({
        categoria: null,
        elementos: elementosABuscar
      })
    }
    
    return grupos
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

  const handlePrintPDF = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/comandas/${params.id}/pdf?tipo=resultados`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const printWindow = window.open(url, '_blank')
        
        if (printWindow) {
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print()
              // Cerrar la ventana después de un tiempo si el usuario no imprime
              setTimeout(() => {
                printWindow.close()
                window.URL.revokeObjectURL(url)
              }, 1000)
            }, 500)
          }
        } else {
          // Si no se puede abrir ventana, descargar como fallback
          const a = document.createElement('a')
          a.href = url
          a.download = `resultados_${comanda?.numeroComanda}.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
          toast('PDF descargado. Por favor ábrelo e imprímelo manualmente.', { icon: 'ℹ️' })
        }
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
              {comanda.resultados.length > 0 && (
                <>
                  <button
                    onClick={handlePrintPDF}
                    className="btn btn-secondary flex items-center gap-2"
                    title="Imprimir resultados membretados"
                  >
                    <PrinterIcon className="h-5 w-5" />
                    Imprimir
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/comandas/${params.id}/modificaciones`)}
                    className="btn btn-secondary flex items-center gap-2"
                    title="Ver modificaciones y formato membretado"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    Modificaciones
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="btn btn-secondary flex items-center gap-2"
                    title="Descargar PDF de resultados"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    Descargar PDF
                  </button>
                </>
              )}
              {getElementosSinResultado().length > 0 && (
                <button
                  onClick={() => handleSubmitResultados()}
                  className="btn btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Agregar Resultados
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información de la comanda */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-tertiary">Sucursal</label>
              <p className="text-primary">{comanda.sucursal.nombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-tertiary">Estado</label>
              <div className="mt-1">
                <span className={`badge ${getEstadoBadge(comanda.estado)}`}>
                  {getEstadoLabel(comanda.estado)}
                </span>
              </div>
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
                  {/* Categoría */}
                  {grupo.categoria ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-tertiary mb-2">
                        Categoría
                      </label>
                      <p className="text-lg font-semibold text-primary mb-3">
                        {getNombreCompletoCategoria(grupo.categoria.nombre, grupo.categoria.id)}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-tertiary mb-2">
                        Otros
                      </label>
                    </div>
                  )}

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
                                      // Mostrar dropdown cuando hay texto y unidades coincidentes
                                      const tieneCoincidencias = unidadesPrevias.filter(u => 
                                        u.toLowerCase().includes(e.target.value.toLowerCase())
                                      ).length > 0
                                      if (e.target.value && tieneCoincidencias) {
                                        setDropdownsAbiertos(prev => ({ ...prev, [elemento]: true }))
                                      }
                                    }}
                                    onFocus={() => {
                                      const tieneCoincidencias = unidadesPrevias.filter(u => 
                                        u.toLowerCase().includes(formData.unidad.toLowerCase())
                                      ).length > 0
                                      if (formData.unidad && tieneCoincidencias) {
                                        setDropdownsAbiertos(prev => ({ ...prev, [elemento]: true }))
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        // Cerrar dropdown al presionar Enter
                                        setDropdownsAbiertos(prev => ({ ...prev, [elemento]: false }))
                                        // Si hay una única coincidencia, seleccionarla
                                        const coincidencias = unidadesPrevias.filter(u => 
                                          u.toLowerCase().includes(formData.unidad.toLowerCase())
                                        )
                                        if (coincidencias.length === 1) {
                                          setResultadosForm(prev => ({
                                            ...prev,
                                            [elemento]: {
                                              ...prev[elemento],
                                              unidad: coincidencias[0]
                                            }
                                          }))
                                          setDropdownsAbiertos(prev => ({ ...prev, [elemento]: false }))
                                        }
                                      } else if (e.key === 'Escape') {
                                        setDropdownsAbiertos(prev => ({ ...prev, [elemento]: false }))
                                      }
                                    }}
                                    onBlur={() => {
                                      // Delay para permitir click en el dropdown
                                      setTimeout(() => {
                                        setDropdownsAbiertos(prev => ({ ...prev, [elemento]: false }))
                                      }, 200)
                                    }}
                                    className="input"
                                    placeholder="mg/dL"
                                    required
                                  />
                                  {/* Dropdown de unidades previas */}
                                  {unidadesPrevias.filter(u => 
                                    u.toLowerCase().includes(formData.unidad.toLowerCase())
                                  ).length > 0 && formData.unidad && dropdownsAbiertos[elemento] && (
                                    <div 
                                      className="absolute z-50 w-full mt-1 border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                                      style={{ 
                                        backgroundColor: 'rgb(var(--color-gray-50))',
                                        color: 'var(--color-text-primary)'
                                      }}
                                      onMouseDown={(e) => e.preventDefault()}
                                    >
                                      {unidadesPrevias.filter(u => 
                                        u.toLowerCase().includes(formData.unidad.toLowerCase())
                                      ).map((unidad, unidadIndex) => (
                                        <div
                                          key={unidadIndex}
                                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer group"
                                          onMouseDown={(e) => {
                                            e.preventDefault()
                                            setResultadosForm(prev => ({
                                              ...prev,
                                              [elemento]: {
                                                ...prev[elemento],
                                                unidad: unidad
                                              }
                                            }))
                                            // Cerrar dropdown al seleccionar
                                            setDropdownsAbiertos(prev => ({ ...prev, [elemento]: false }))
                                          }}
                                        >
                                          <span className="text-sm font-medium text-secondary">{unidad}</span>
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

