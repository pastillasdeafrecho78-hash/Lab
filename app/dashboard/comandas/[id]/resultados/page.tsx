'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

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
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingResultado, setEditingResultado] = useState<string | null>(null)
  const router = useRouter()

  // Formulario de resultado individual
  const [formData, setFormData] = useState({
    elemento: '',
    valor: '',
    unidad: '',
    rangoNormal: '',
    observaciones: ''
  })

  // Formulario de resultados múltiples
  const [bulkData, setBulkData] = useState<Array<{
    elemento: string
    valor: string
    unidad: string
    rangoNormal: string
    observaciones: string
  }>>([])

  useEffect(() => {
    loadComanda()
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
        initializeBulkData(data.data)
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

  const initializeBulkData = (comandaData: Comanda) => {
    const elementosSinResultado = comandaData.elementos.filter(elemento => 
      !comandaData.resultados.some(resultado => resultado.elemento === elemento)
    )

    setBulkData(elementosSinResultado.map(elemento => ({
      elemento,
      valor: '',
      unidad: '',
      rangoNormal: '',
      observaciones: ''
    })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.elemento || !formData.valor || !formData.unidad || !formData.rangoNormal) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/resultados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          comandaId: params.id,
          elemento: formData.elemento,
          valor: parseFloat(formData.valor),
          unidad: formData.unidad,
          rangoNormal: formData.rangoNormal,
          observaciones: formData.observaciones
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Resultado registrado exitosamente')
        setShowModal(false)
        setFormData({
          elemento: '',
          valor: '',
          unidad: '',
          rangoNormal: '',
          observaciones: ''
        })
        loadComanda()
      } else {
        toast.error(data.error || 'Error al registrar resultado')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const resultadosValidos = bulkData.filter(r => 
      r.elemento && r.valor && r.unidad && r.rangoNormal
    )

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
        body: JSON.stringify({
          resultados: resultadosValidos.map(r => ({
            elemento: r.elemento,
            valor: parseFloat(r.valor),
            unidad: r.unidad,
            rangoNormal: r.rangoNormal,
            observaciones: r.observaciones
          }))
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`${data.data.resultadosCreados} resultados registrados exitosamente`)
        if (data.data.comandaCompletada) {
          toast.success('¡Comanda completada!')
        }
        setShowBulkModal(false)
        loadComanda()
      } else {
        toast.error(data.error || 'Error al registrar resultados')
      }
    } catch (error) {
      toast.error('Error de conexión')
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
                onClick={() => router.push(`/dashboard/comandas/${params.id}`)}
                className="mr-4 p-2 hover:bg-secondary-100 rounded-lg"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-secondary-900">
                  Resultados - {comanda.numeroComanda}
                </h1>
                <p className="text-sm text-secondary-500">
                  {comanda.cliente.nombre} {comanda.cliente.apellido}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {comanda.resultados.length > 0 && (
                <button
                  onClick={handleDownloadPDF}
                  className="btn btn-secondary btn-sm"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Descargar PDF
                </button>
              )}
              
              {getElementosSinResultado().length > 0 && (
                <>
                  <button
                    onClick={() => setShowModal(true)}
                    className="btn btn-primary btn-sm"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Agregar Resultado
                  </button>
                  
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="btn btn-success btn-sm"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Agregar Múltiples
                  </button>
                </>
              )}
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
              <label className="text-sm font-medium text-secondary-500">Tipo de Prueba</label>
              <p className="text-secondary-900">{comanda.tipoPrueba.nombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-500">Sucursal</label>
              <p className="text-secondary-900">{comanda.sucursal.nombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-500">Estado</label>
              <p className="text-secondary-900">{comanda.estado.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Resultados ({comanda.resultados.length}/{comanda.elementos.length})
            </h3>
          </div>

          {comanda.resultados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary-500">No hay resultados registrados</p>
            </div>
          ) : (
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
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Registrado Por
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {comanda.resultados.map((resultado) => {
                    const isNormal = isValorNormal(resultado.valor, resultado.rangoNormal)
                    return (
                      <tr key={resultado.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {resultado.elemento.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                          {resultado.valor} {resultado.unidad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {resultado.rangoNormal}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${isNormal ? 'badge-success' : 'badge-danger'}`}>
                            {isNormal ? 'Normal' : 'Fuera de Rango'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
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
          )}
        </div>
      </main>

      {/* Modal Agregar Resultado Individual */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-secondary-900">Agregar Resultado</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Elemento *
                  </label>
                  <select
                    value={formData.elemento}
                    onChange={(e) => setFormData(prev => ({ ...prev, elemento: e.target.value }))}
                    className="input"
                    required
                  >
                    <option value="">Seleccionar elemento</option>
                    {getElementosSinResultado().map(elemento => (
                      <option key={elemento} value={elemento}>
                        {elemento.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Valor *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Unidad *
                    </label>
                    <input
                      type="text"
                      value={formData.unidad}
                      onChange={(e) => setFormData(prev => ({ ...prev, unidad: e.target.value }))}
                      className="input"
                      placeholder="mg/dL, %, etc."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Rango Normal *
                  </label>
                  <input
                    type="text"
                    value={formData.rangoNormal}
                    onChange={(e) => setFormData(prev => ({ ...prev, rangoNormal: e.target.value }))}
                    className="input"
                    placeholder="70 - 100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                    className="input"
                    rows={3}
                  />
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
                    Agregar Resultado
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Resultados Múltiples */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-secondary-900">Agregar Resultados Múltiples</h2>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleBulkSubmit} className="space-y-6">
                {bulkData.map((item, index) => (
                  <div key={item.elemento} className="border border-secondary-200 rounded-lg p-4">
                    <h4 className="font-medium text-secondary-900 mb-4">
                      {item.elemento.replace('_', ' ')}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Valor *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.valor}
                          onChange={(e) => {
                            const newData = [...bulkData]
                            newData[index].valor = e.target.value
                            setBulkData(newData)
                          }}
                          className="input"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Unidad *
                        </label>
                        <input
                          type="text"
                          value={item.unidad}
                          onChange={(e) => {
                            const newData = [...bulkData]
                            newData[index].unidad = e.target.value
                            setBulkData(newData)
                          }}
                          className="input"
                          placeholder="mg/dL"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Rango Normal *
                        </label>
                        <input
                          type="text"
                          value={item.rangoNormal}
                          onChange={(e) => {
                            const newData = [...bulkData]
                            newData[index].rangoNormal = e.target.value
                            setBulkData(newData)
                          }}
                          className="input"
                          placeholder="70 - 100"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Observaciones
                        </label>
                        <input
                          type="text"
                          value={item.observaciones}
                          onChange={(e) => {
                            const newData = [...bulkData]
                            newData[index].observaciones = e.target.value
                            setBulkData(newData)
                          }}
                          className="input"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Agregar Resultados
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
