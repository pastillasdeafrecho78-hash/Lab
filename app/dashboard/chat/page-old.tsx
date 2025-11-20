'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  XMarkIcon,
  PhotoIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

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

interface Mensaje {
  id: string
  contenido: string
  tipo: 'GENERAL' | 'SUCURSAL' | 'PRIVADO'
  sucursalId?: string
  destinatarioId?: string
  archivoUrl?: string
  tipoArchivo?: string
  nombreArchivo?: string
  fechaEnvio: string
  leido: boolean
  remitente: {
    id: string
    nombre: string
    apellido: string
    rol: string
  }
  sucursal?: {
    id: string
    nombre: string
  }
}

interface Sucursal {
  id: string
  nombre: string
}

interface UsuarioChat {
  id: string
  nombre: string
  apellido: string
  rol: string
}

export default function ChatPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioChat[]>([])
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [loading, setLoading] = useState(true)
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [tipoChat, setTipoChat] = useState<'GENERAL' | 'SUCURSAL' | 'PRIVADO'>('GENERAL')
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('')
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('')
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [isTyping, setIsTyping] = useState(false)
  const [archivoAdjunto, setArchivoAdjunto] = useState<{ file: File; url: string; tipo: string } | null>(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    if (usuario) {
      initializeSocket()
    }
  }, [usuario])

  useEffect(() => {
    scrollToBottom()
  }, [mensajes])

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/')
        return
      }

      const [usuarioRes, sucursalesRes, usuariosRes] = await Promise.all([
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/sucursales', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/usuarios', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const [usuarioData, sucursalesData, usuariosData] = await Promise.all([
        usuarioRes.json(),
        sucursalesRes.json(),
        usuariosRes.json()
      ])

      if (usuarioData.success) {
        setUsuario(usuarioData.data)
        setSucursalSeleccionada(usuarioData.data.sucursales[0]?.id || '')
      }
      if (sucursalesData.success) setSucursales(sucursalesData.data)
      if (usuariosData.success) setUsuarios(usuariosData.data)

    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const initializeSocket = () => {
    if (!usuario) return

    // Deshabilitar Socket.IO temporalmente hasta que el endpoint esté configurado
    // El chat funcionará sin tiempo real, solo con polling
    console.log('Socket.IO deshabilitado temporalmente')
    return

    // Código comentado para cuando se configure el endpoint correctamente
    /*
    const token = localStorage.getItem('token')
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      path: '/api/socket',
      auth: {
        token: token
      },
      reconnection: false, // Deshabilitar reconexión automática
      timeout: 5000
    })

    newSocket.on('connect', () => {
      console.log('Conectado al chat')
      loadMensajes()
    })

    newSocket.on('connect_error', (error) => {
      console.log('Error de conexión Socket.IO (ignorado):', error.message)
      // No mostrar error al usuario, el chat funcionará sin tiempo real
    })

    newSocket.on('new_message', (mensaje: Mensaje) => {
      setMensajes(prev => [mensaje, ...prev])
    })

    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => new Set([...prev, data.nombre]))
    })

    newSocket.on('user_stopped_typing', (data) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(data.nombre)
        return newSet
      })
    })

    newSocket.on('error', (error) => {
      console.log('Error Socket.IO (ignorado):', error)
    })

    setSocket(newSocket)
    */
  }

  const loadMensajes = async () => {
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        tipo: tipoChat,
        limit: '50'
      })

      if (tipoChat === 'SUCURSAL' && sucursalSeleccionada) {
        params.append('sucursalId', sucursalSeleccionada)
      }

      if (tipoChat === 'PRIVADO' && usuarioSeleccionado) {
        params.append('destinatarioId', usuarioSeleccionado)
      }

      const response = await fetch(`/api/mensajes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setMensajes(data.data.reverse()) // Invertir para mostrar más recientes abajo
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 10MB')
      return
    }

    setSubiendoArchivo(true)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', file)

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
          url: data.data.url,
          tipo: data.data.tipo
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

  const removeArchivo = () => {
    setArchivoAdjunto(null)
  }

  const sendMessage = async () => {
    if (!nuevoMensaje.trim() && !archivoAdjunto) return

    // Enviar mensaje directamente por API en lugar de Socket.IO
    try {
      const token = localStorage.getItem('token')
      const messageData: any = {
        contenido: nuevoMensaje.trim() || (archivoAdjunto ? `Archivo: ${archivoAdjunto.file.name}` : ''),
        tipo: tipoChat,
        sucursalId: tipoChat === 'SUCURSAL' ? sucursalSeleccionada : undefined,
        destinatarioId: tipoChat === 'PRIVADO' ? usuarioSeleccionado : undefined
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
        // Recargar mensajes después de enviar
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

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNuevoMensaje(e.target.value)
    // Typing indicators deshabilitados temporalmente (requieren Socket.IO)
    // if (!isTyping && socket) {
    //   setIsTyping(true)
    //   socket.emit('typing_start', {
    //     tipo: tipoChat,
    //     sucursalId: tipoChat === 'SUCURSAL' ? sucursalSeleccionada : undefined,
    //     destinatarioId: tipoChat === 'PRIVADO' ? usuarioSeleccionado : undefined
    //   })
    // }
  }

  const stopTyping = () => {
    // Typing indicators deshabilitados temporalmente (requieren Socket.IO)
    // if (isTyping && socket) {
    //   setIsTyping(false)
    //   socket.emit('typing_stop', {
    //     tipo: tipoChat,
    //     sucursalId: tipoChat === 'SUCURSAL' ? sucursalSeleccionada : undefined,
    //     destinatarioId: tipoChat === 'PRIVADO' ? usuarioSeleccionado : undefined
    //   })
    // }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getChatTitle = () => {
    switch (tipoChat) {
      case 'GENERAL':
        return 'Chat General'
      case 'SUCURSAL':
        const sucursal = sucursales.find(s => s.id === sucursalSeleccionada)
        return sucursal ? `Chat - ${sucursal.nombre}` : 'Chat de Sucursal'
      case 'PRIVADO':
        const usuario = usuarios.find(u => u.id === usuarioSeleccionado)
        return usuario ? `Chat con ${usuario.nombre} ${usuario.apellido}` : 'Chat Privado'
      default:
        return 'Chat'
    }
  }

  const getChatIcon = () => {
    switch (tipoChat) {
      case 'GENERAL':
        return <UserGroupIcon className="h-5 w-5" />
      case 'SUCURSAL':
        return <BuildingOfficeIcon className="h-5 w-5" />
      case 'PRIVADO':
        return <ChatBubbleLeftRightIcon className="h-5 w-5" />
      default:
        return <ChatBubbleLeftRightIcon className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error al cargar usuario</h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn-primary"
          >
            Volver al Dashboard
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
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                {getChatIcon()}
                <h1 className="text-xl font-semibold text-gray-900 ml-2">
                  {getChatTitle()}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Selector de tipo de chat */}
              <select
                value={tipoChat}
                onChange={(e) => {
                  setTipoChat(e.target.value as 'GENERAL' | 'SUCURSAL' | 'PRIVADO')
                  setMensajes([])
                }}
                className="input"
              >
                <option value="GENERAL">General</option>
                <option value="SUCURSAL">Sucursal</option>
                <option value="PRIVADO">Privado</option>
              </select>

              {/* Selector de sucursal */}
              {tipoChat === 'SUCURSAL' && (
                <select
                  value={sucursalSeleccionada}
                  onChange={(e) => {
                    setSucursalSeleccionada(e.target.value)
                    setMensajes([])
                  }}
                  className="input"
                >
                  {usuario.sucursales.map(sucursal => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              )}

              {/* Selector de usuario */}
              {tipoChat === 'PRIVADO' && (
                <select
                  value={usuarioSeleccionado}
                  onChange={(e) => {
                    setUsuarioSeleccionado(e.target.value)
                    setMensajes([])
                  }}
                  className="input"
                >
                  <option value="">Seleccionar usuario</option>
                  {usuarios.filter(u => u.id !== usuario.id).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.nombre} {user.apellido}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card h-[600px] flex flex-col">
          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mensajes.map((mensaje) => (
              <div
                key={mensaje.id}
                className={`flex ${mensaje.remitente.id === usuario.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    mensaje.remitente.id === usuario.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {mensaje.remitente.id !== usuario.id && (
                    <div className="text-xs font-medium mb-1">
                      {mensaje.remitente.nombre} {mensaje.remitente.apellido}
                    </div>
                  )}
                  {mensaje.archivoUrl && (
                    <div className="mb-2">
                      {mensaje.tipoArchivo === 'imagen' ? (
                        <img
                          src={mensaje.archivoUrl}
                          alt={mensaje.nombreArchivo || 'Imagen adjunta'}
                          className="max-w-full h-auto rounded-lg mb-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-image.png'
                          }}
                        />
                      ) : (
                        <a
                          href={mensaje.archivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center space-x-2 p-2 rounded ${
                            mensaje.remitente.id === usuario.id
                              ? 'bg-gray-100/20 hover:bg-gray-100/30'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          <DocumentIcon className="h-5 w-5" />
                          <span className="text-sm truncate">
                            {mensaje.nombreArchivo || 'Documento adjunto'}
                          </span>
                        </a>
                      )}
                    </div>
                  )}
                  {mensaje.contenido && (
                    <div className="text-sm">{mensaje.contenido}</div>
                  )}
                  <div className="text-xs opacity-75 mt-1">
                    {new Date(mensaje.fechaEnvio).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Indicador de typing */}
            {typingUsers.size > 0 && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm">
                  {Array.from(typingUsers).join(', ')} está escribiendo...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input de mensaje */}
          <div className="border-t border-gray-200 p-4">
            {archivoAdjunto && (
              <div className="mb-2 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {archivoAdjunto.tipo === 'imagen' ? (
                    <PhotoIcon className="h-5 w-5 text-primary-600" />
                  ) : (
                    <DocumentIcon className="h-5 w-5 text-primary-600" />
                  )}
                  <span className="text-sm text-gray-700 truncate">
                    {archivoAdjunto.file.name}
                  </span>
                </div>
                <button
                  onClick={removeArchivo}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="flex space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={subiendoArchivo || (tipoChat === 'PRIVADO' && !usuarioSeleccionado)}
                className="btn btn-secondary p-2"
                title="Adjuntar archivo"
              >
                {subiendoArchivo ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                ) : (
                  <PaperClipIcon className="h-5 w-5" />
                )}
              </button>
              <input
                type="text"
                value={nuevoMensaje}
                onChange={handleTyping}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage()
                  }
                }}
                placeholder={
                  tipoChat === 'PRIVADO' && !usuarioSeleccionado
                    ? 'Selecciona un usuario para chatear'
                    : 'Escribe tu mensaje...'
                }
                disabled={tipoChat === 'PRIVADO' && !usuarioSeleccionado}
                className="input flex-1"
              />
              <button
                onClick={sendMessage}
                disabled={(!nuevoMensaje.trim() && !archivoAdjunto) || (tipoChat === 'PRIVADO' && !usuarioSeleccionado)}
                className="btn btn-primary"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
