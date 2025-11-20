'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  HashtagIcon,
  PlusIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CpuChipIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { getAuthToken, getAuthHeaders } from '@/lib/api-helpers'

interface Usuario {
  id: string
  nombre: string
  apellido: string
  rol: string
  sucursales: Array<{
    id: string
    nombre: string
  }>
}

interface Canal {
  id: string
  nombre: string
  descripcion?: string
  categoria: 'GENERAL' | 'SUCURSAL' | 'EQUIPO'
  tipo: 'TEXTO' | 'VOZ'
  orden: number
  activo: boolean
  creadoPor: {
    id: string
    nombre: string
    apellido: string
  }
  sucursal?: {
    id: string
    nombre: string
  }
  equipo?: {
    id: string
    nombre: string
  }
  _count: {
    mensajes: number
  }
}

interface Mensaje {
  id: string
  contenido: string
  canalId: string
  archivoUrl?: string
  tipoArchivo?: string
  nombreArchivo?: string
  editado: boolean
  eliminado: boolean
  fechaEnvio: string
  remitente: {
    id: string
    nombre: string
    apellido: string
    rol: string
  }
}

interface Sucursal {
  id: string
  nombre: string
}

interface Maquinaria {
  id: string
  nombre: string
}

export default function ChatPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [canales, setCanales] = useState<Canal[]>([])
  const [canalSeleccionado, setCanalSeleccionado] = useState<Canal | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [maquinaria, setMaquinaria] = useState<Maquinaria[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [archivoAdjunto, setArchivoAdjunto] = useState<{ file: File; url: string; tipo: string } | null>(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [showModalCrearCanal, setShowModalCrearCanal] = useState(false)
  const [showModalEditarCanal, setShowModalEditarCanal] = useState(false)
  const [canalEditando, setCanalEditando] = useState<Canal | null>(null)
  const [formCanal, setFormCanal] = useState({
    nombre: '',
    descripcion: '',
    categoria: 'GENERAL' as 'GENERAL' | 'SUCURSAL' | 'EQUIPO',
    sucursalId: '',
    equipoId: ''
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (canalSeleccionado) {
      loadMensajes()
    }
  }, [canalSeleccionado])

  useEffect(() => {
    scrollToBottom()
  }, [mensajes])

  const loadData = async () => {
    try {
      const headers = getAuthHeaders()

      const [usuarioRes, canalesRes, sucursalesRes, maquinariaRes] = await Promise.all([
        fetch('/api/auth/me', { headers }),
        fetch('/api/canales', { headers }),
        fetch('/api/sucursales', { headers }),
        fetch('/api/maquinaria', { headers })
      ])

      const [usuarioData, canalesData, sucursalesData, maquinariaData] = await Promise.all([
        usuarioRes.json(),
        canalesRes.json(),
        sucursalesRes.json(),
        maquinariaRes.json()
      ])

      if (usuarioData.success) {
        setUsuario(usuarioData.data)
      }

      if (canalesData.success) {
        setCanales(canalesData.data)
        // Seleccionar el primer canal general si existe
        const canalGeneral = canalesData.data.find((c: Canal) => 
          c.categoria === 'GENERAL' && c.nombre.toLowerCase() === 'general'
        )
        if (canalGeneral) {
          setCanalSeleccionado(canalGeneral)
        } else if (canalesData.data.length > 0) {
          setCanalSeleccionado(canalesData.data[0])
        }
      }

      if (sucursalesData.success) {
        setSucursales(sucursalesData.data.filter((s: Sucursal) => s.activa))
      }

      if (maquinariaData.success) {
        setMaquinaria(maquinariaData.data.filter((m: Maquinaria) => m.activa))
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const loadMensajes = async () => {
    if (!canalSeleccionado) return

    try {
      const headers = getAuthHeaders()
      const response = await fetch(`/api/mensajes?canalId=${canalSeleccionado.id}&limit=100`, { headers })
      const data = await response.json()

      if (data.success) {
        setMensajes(data.data.reverse())
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error)
    }
  }

  const sendMessage = async () => {
    if (!canalSeleccionado || (!nuevoMensaje.trim() && !archivoAdjunto)) return

    try {
      const token = getAuthToken()
      const messageData: any = {
        contenido: nuevoMensaje.trim() || (archivoAdjunto ? `Archivo: ${archivoAdjunto.file.name}` : ''),
        canalId: canalSeleccionado.id
      }

      if (archivoAdjunto) {
        messageData.archivoUrl = archivoAdjunto.url
        messageData.tipoArchivo = archivoAdjunto.tipo
        messageData.nombreArchivo = archivoAdjunto.file.name
      }

      const response = await fetch('/api/mensajes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messageData)
      })

      const data = await response.json()
      if (data.success) {
        await loadMensajes()
        setNuevoMensaje('')
        setArchivoAdjunto(null)
      } else {
        toast.error(data.error || 'Error al enviar mensaje')
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
      toast.error('Error al enviar mensaje')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSubiendoArchivo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = getAuthToken()
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        setArchivoAdjunto({
          file,
          url: data.url,
          tipo: file.type.startsWith('image/') ? 'imagen' : 'documento'
        })
        toast.success('Archivo listo para enviar')
      } else {
        toast.error(data.error || 'Error al subir archivo')
      }
    } catch (error) {
      toast.error('Error al subir archivo')
    } finally {
      setSubiendoArchivo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCrearCanal = async () => {
    if (!formCanal.nombre.trim()) {
      toast.error('El nombre del canal es requerido')
      return
    }

    if (formCanal.categoria === 'SUCURSAL' && !formCanal.sucursalId) {
      toast.error('Selecciona una sucursal')
      return
    }

    if (formCanal.categoria === 'EQUIPO' && !formCanal.equipoId) {
      toast.error('Selecciona un equipo')
      return
    }

    try {
      const headers = getAuthHeaders()
      const response = await fetch('/api/canales', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: formCanal.nombre,
          descripcion: formCanal.descripcion || undefined,
          categoria: formCanal.categoria,
          sucursalId: formCanal.categoria === 'SUCURSAL' ? formCanal.sucursalId : undefined,
          equipoId: formCanal.categoria === 'EQUIPO' ? formCanal.equipoId : undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Canal creado exitosamente')
        setShowModalCrearCanal(false)
        setFormCanal({ nombre: '', descripcion: '', categoria: 'GENERAL', sucursalId: '', equipoId: '' })
        await loadData()
      } else {
        toast.error(data.error || 'Error al crear canal')
      }
    } catch (error) {
      console.error('Error al crear canal:', error)
      toast.error('Error al crear canal')
    }
  }

  const handleEditarCanal = async () => {
    if (!canalEditando || !formCanal.nombre.trim()) {
      toast.error('El nombre del canal es requerido')
      return
    }

    try {
      const headers = getAuthHeaders()
      const response = await fetch(`/api/canales/${canalEditando.id}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: formCanal.nombre,
          descripcion: formCanal.descripcion || null
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Canal actualizado exitosamente')
        setShowModalEditarCanal(false)
        setCanalEditando(null)
        await loadData()
      } else {
        toast.error(data.error || 'Error al actualizar canal')
      }
    } catch (error) {
      console.error('Error al actualizar canal:', error)
      toast.error('Error al actualizar canal')
    }
  }

  const handleEliminarCanal = async (canal: Canal) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el canal "${canal.nombre}"?`)) {
      return
    }

    try {
      const headers = getAuthHeaders()
      const response = await fetch(`/api/canales/${canal.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Canal eliminado exitosamente')
        if (canalSeleccionado?.id === canal.id) {
          setCanalSeleccionado(null)
        }
        await loadData()
      } else {
        toast.error(data.error || 'Error al eliminar canal')
      }
    } catch (error) {
      console.error('Error al eliminar canal:', error)
      toast.error('Error al eliminar canal')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const canalesPorCategoria = {
    GENERAL: canales.filter(c => c.categoria === 'GENERAL'),
    SUCURSAL: canales.filter(c => c.categoria === 'SUCURSAL'),
    EQUIPO: canales.filter(c => c.categoria === 'EQUIPO')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#36393f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#5865f2]"></div>
      </div>
    )
  }

  if (!usuario) {
    return null
  }

  return (
    <div className="flex h-screen bg-[#36393f] text-[#dcddde] overflow-hidden">
      {/* Sidebar Izquierda - Categorías */}
      <div className="w-16 bg-[#2f3136] flex flex-col items-center py-4 space-y-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-12 h-12 rounded-lg bg-[#5865f2] flex items-center justify-center hover:bg-[#4752c4] transition"
          title="Volver al Dashboard"
        >
          <UserGroupIcon className="h-6 w-6 text-white" />
        </button>
        
        <div className="w-12 h-12 rounded-lg bg-[#5865f2] flex items-center justify-center hover:bg-[#4752c4] transition cursor-pointer" title="General">
          <HashtagIcon className="h-6 w-6 text-white" />
        </div>
        
        {sucursales.length > 0 && (
          <div className="w-12 h-12 rounded-lg bg-[#5865f2] flex items-center justify-center hover:bg-[#4752c4] transition cursor-pointer" title="Sucursales">
            <BuildingOfficeIcon className="h-6 w-6 text-white" />
          </div>
        )}
        
        {maquinaria.length > 0 && (
          <div className="w-12 h-12 rounded-lg bg-[#5865f2] flex items-center justify-center hover:bg-[#4752c4] transition cursor-pointer" title="Equipos">
            <CpuChipIcon className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      {/* Lista de Canales */}
      <div className="w-60 bg-[#2f3136] flex flex-col">
        <div className="p-4 border-b border-[#202225]">
          <h2 className="text-sm font-semibold text-[#8e9297] uppercase">Canales</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Canales GENERAL */}
          {canalesPorCategoria.GENERAL.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-semibold text-[#8e9297] uppercase flex items-center justify-between">
                <span>General</span>
              </div>
              {canalesPorCategoria.GENERAL.map(canal => (
                <div
                  key={canal.id}
                  className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-[#3c3f44] ${
                    canalSeleccionado?.id === canal.id ? 'bg-[#3c3f44]' : ''
                  }`}
                  onClick={() => setCanalSeleccionado(canal)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <HashtagIcon className="h-4 w-4 text-[#8e9297] flex-shrink-0" />
                    <span className="text-sm truncate">{canal.nombre}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCanalEditando(canal)
                        setFormCanal({
                          nombre: canal.nombre,
                          descripcion: canal.descripcion || '',
                          categoria: canal.categoria,
                          sucursalId: canal.sucursal?.id || '',
                          equipoId: canal.equipo?.id || ''
                        })
                        setShowModalEditarCanal(true)
                      }}
                      className="p-1 hover:bg-[#40444b] rounded"
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                    {canal.categoria !== 'GENERAL' || canal.nombre.toLowerCase() !== 'general' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEliminarCanal(canal)
                        }}
                        className="p-1 hover:bg-[#40444b] rounded text-red-400"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Canales SUCURSAL */}
          {canalesPorCategoria.SUCURSAL.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-semibold text-[#8e9297] uppercase flex items-center justify-between mt-4">
                <span>Sucursales</span>
              </div>
              {canalesPorCategoria.SUCURSAL.map(canal => (
                <div
                  key={canal.id}
                  className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-[#3c3f44] ${
                    canalSeleccionado?.id === canal.id ? 'bg-[#3c3f44]' : ''
                  }`}
                  onClick={() => setCanalSeleccionado(canal)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <HashtagIcon className="h-4 w-4 text-[#8e9297] flex-shrink-0" />
                    <span className="text-sm truncate">{canal.nombre}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCanalEditando(canal)
                        setFormCanal({
                          nombre: canal.nombre,
                          descripcion: canal.descripcion || '',
                          categoria: canal.categoria,
                          sucursalId: canal.sucursal?.id || '',
                          equipoId: canal.equipo?.id || ''
                        })
                        setShowModalEditarCanal(true)
                      }}
                      className="p-1 hover:bg-[#40444b] rounded"
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEliminarCanal(canal)
                      }}
                      className="p-1 hover:bg-[#40444b] rounded text-red-400"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Canales EQUIPO */}
          {canalesPorCategoria.EQUIPO.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-semibold text-[#8e9297] uppercase flex items-center justify-between mt-4">
                <span>Equipos</span>
              </div>
              {canalesPorCategoria.EQUIPO.map(canal => (
                <div
                  key={canal.id}
                  className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-[#3c3f44] ${
                    canalSeleccionado?.id === canal.id ? 'bg-[#3c3f44]' : ''
                  }`}
                  onClick={() => setCanalSeleccionado(canal)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <HashtagIcon className="h-4 w-4 text-[#8e9297] flex-shrink-0" />
                    <span className="text-sm truncate">{canal.nombre}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCanalEditando(canal)
                        setFormCanal({
                          nombre: canal.nombre,
                          descripcion: canal.descripcion || '',
                          categoria: canal.categoria,
                          sucursalId: canal.sucursal?.id || '',
                          equipoId: canal.equipo?.id || ''
                        })
                        setShowModalEditarCanal(true)
                      }}
                      className="p-1 hover:bg-[#40444b] rounded"
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEliminarCanal(canal)
                      }}
                      className="p-1 hover:bg-[#40444b] rounded text-red-400"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Botón crear canal */}
          <button
            onClick={() => {
              setFormCanal({ nombre: '', descripcion: '', categoria: 'GENERAL', sucursalId: '', equipoId: '' })
              setShowModalCrearCanal(true)
            }}
            className="w-full mt-2 px-2 py-1.5 text-sm text-[#8e9297] hover:text-[#dcddde] hover:bg-[#3c3f44] rounded flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Crear Canal</span>
          </button>
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col">
        {canalSeleccionado ? (
          <>
            {/* Header del canal */}
            <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center justify-between px-4 shadow-sm">
              <div className="flex items-center space-x-2">
                <HashtagIcon className="h-5 w-5 text-[#8e9297]" />
                <h2 className="font-semibold">{canalSeleccionado.nombre}</h2>
                {canalSeleccionado.descripcion && (
                  <span className="text-sm text-[#8e9297]">- {canalSeleccionado.descripcion}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1.5 hover:bg-[#40444b] rounded">
                  <Cog6ToothIcon className="h-5 w-5 text-[#8e9297]" />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mensajes.map((mensaje) => (
                <div key={mensaje.id} className="flex items-start space-x-3 group hover:bg-[#3c3f44] rounded p-2 -m-2">
                  <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">
                      {mensaje.remitente.nombre[0]}{mensaje.remitente.apellido[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold">{mensaje.remitente.nombre} {mensaje.remitente.apellido}</span>
                      <span className="text-xs text-[#8e9297]">
                        {new Date(mensaje.fechaEnvio).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {mensaje.editado && (
                        <span className="text-xs text-[#8e9297] italic">(editado)</span>
                      )}
                    </div>
                    {mensaje.archivoUrl && (
                      <div className="mb-2">
                        {mensaje.tipoArchivo === 'imagen' ? (
                          <img
                            src={mensaje.archivoUrl}
                            alt={mensaje.nombreArchivo || 'Imagen'}
                            className="max-w-md h-auto rounded-lg"
                          />
                        ) : (
                          <a
                            href={mensaje.archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 p-2 bg-[#40444b] rounded hover:bg-[#4a4e55]"
                          >
                            <PaperClipIcon className="h-4 w-4" />
                            <span className="text-sm">{mensaje.nombreArchivo || 'Archivo'}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {mensaje.contenido && (
                      <p className="text-[#dcddde]">{mensaje.contenido}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <div className="p-4 border-t border-[#202225]">
              {archivoAdjunto && (
                <div className="mb-2 p-2 bg-[#40444b] rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PaperClipIcon className="h-4 w-4 text-[#5865f2]" />
                    <span className="text-sm truncate">{archivoAdjunto.file.name}</span>
                  </div>
                  <button
                    onClick={() => setArchivoAdjunto(null)}
                    className="text-[#8e9297] hover:text-[#dcddde]"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={subiendoArchivo}
                  className="p-2 text-[#8e9297] hover:text-[#dcddde] hover:bg-[#40444b] rounded"
                >
                  {subiendoArchivo ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5865f2]"></div>
                  ) : (
                    <PaperClipIcon className="h-5 w-5" />
                  )}
                </button>
                <input
                  type="text"
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={`Mensaje #${canalSeleccionado.nombre}`}
                  className="flex-1 bg-[#40444b] text-[#dcddde] px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!nuevoMensaje.trim() && !archivoAdjunto}
                  className="p-2 bg-[#5865f2] text-white rounded-lg hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <HashtagIcon className="h-16 w-16 text-[#8e9297] mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Selecciona un canal</h2>
              <p className="text-[#8e9297]">Elige un canal de la lista para comenzar a chatear</p>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {showModalCrearCanal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2f3136] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Crear Canal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <input
                  type="text"
                  value={formCanal.nombre}
                  onChange={(e) => setFormCanal({ ...formCanal, nombre: e.target.value })}
                  className="w-full bg-[#40444b] text-[#dcddde] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                  placeholder="nombre-del-canal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Descripción (opcional)</label>
                <input
                  type="text"
                  value={formCanal.descripcion}
                  onChange={(e) => setFormCanal({ ...formCanal, descripcion: e.target.value })}
                  className="w-full bg-[#40444b] text-[#dcddde] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                  placeholder="Descripción del canal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Categoría</label>
                <select
                  value={formCanal.categoria}
                  onChange={(e) => setFormCanal({ ...formCanal, categoria: e.target.value as any, sucursalId: '', equipoId: '' })}
                  className="w-full bg-[#40444b] text-[#dcddde] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                >
                  <option value="GENERAL">General</option>
                  <option value="SUCURSAL">Sucursal</option>
                  <option value="EQUIPO">Equipo</option>
                </select>
              </div>
              {formCanal.categoria === 'SUCURSAL' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Sucursal</label>
                  <select
                    value={formCanal.sucursalId}
                    onChange={(e) => setFormCanal({ ...formCanal, sucursalId: e.target.value })}
                    className="w-full bg-[#40444b] text-[#dcddde] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                  >
                    <option value="">Selecciona una sucursal</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              {formCanal.categoria === 'EQUIPO' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Equipo</label>
                  <select
                    value={formCanal.equipoId}
                    onChange={(e) => setFormCanal({ ...formCanal, equipoId: e.target.value })}
                    className="w-full bg-[#40444b] text-[#dcddde] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                  >
                    <option value="">Selecciona un equipo</option>
                    {maquinaria.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowModalCrearCanal(false)}
                className="px-4 py-2 bg-[#40444b] rounded hover:bg-[#4a4e55]"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearCanal}
                className="px-4 py-2 bg-[#5865f2] rounded hover:bg-[#4752c4]"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalEditarCanal && canalEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2f3136] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Editar Canal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <input
                  type="text"
                  value={formCanal.nombre}
                  onChange={(e) => setFormCanal({ ...formCanal, nombre: e.target.value })}
                  className="w-full bg-[#40444b] text-[#dcddde] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Descripción (opcional)</label>
                <input
                  type="text"
                  value={formCanal.descripcion}
                  onChange={(e) => setFormCanal({ ...formCanal, descripcion: e.target.value })}
                  className="w-full bg-[#40444b] text-[#dcddde] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowModalEditarCanal(false)
                  setCanalEditando(null)
                }}
                className="px-4 py-2 bg-[#40444b] rounded hover:bg-[#4a4e55]"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditarCanal}
                className="px-4 py-2 bg-[#5865f2] rounded hover:bg-[#4752c4]"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

