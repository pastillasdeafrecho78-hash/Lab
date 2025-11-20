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
import { applyThemeColors, getThemeColors } from '@/lib/theme'
import { 
  subscribeToChannelMessages, 
  sendMessageToFirebase
} from '@/lib/firebase-chat'
import { isFirebaseConfigured } from '@/lib/firebase'
import type { Unsubscribe } from 'firebase/firestore'

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
  const [themeApplied, setThemeApplied] = useState(false)
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [archivoAdjunto, setArchivoAdjunto] = useState<{ file: File; url: string; tipo: string } | null>(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const [showModalCrearCanal, setShowModalCrearCanal] = useState(false)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)
  const firebaseSnapshotReceivedRef = useRef(false) // Rastrear si se recibió al menos un snapshot
  const [usingFirebase, setUsingFirebase] = useState(false)
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
    // Aplicar colores personalizados al cargar - FORZAR aplicación inmediata
    const loadTheme = async () => {
      try {
        const themeColors = await getThemeColors()
        console.log('[CHAT] Tema cargado:', themeColors)
        
        // Aplicar inmediatamente
        applyThemeColors(themeColors)
        setThemeApplied(true)
        
        // Forzar re-aplicación múltiple para asegurar que se apliquen
        const applyMultiple = () => {
          applyThemeColors(themeColors)
        }
        
        setTimeout(applyMultiple, 50)
        setTimeout(applyMultiple, 100)
        setTimeout(applyMultiple, 200)
        setTimeout(applyMultiple, 500)
        setTimeout(applyMultiple, 1000)
        
        // También aplicar cuando el DOM esté listo
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', applyMultiple)
        } else {
          applyMultiple()
        }
      } catch (error) {
        console.error('[CHAT] Error al cargar tema:', error)
        setThemeApplied(true) // Marcar como aplicado incluso si hay error
      }
    }
    loadTheme()
    loadData()
  }, [])

  useEffect(() => {
    if (canalSeleccionado) {
      // Resetear el flag cuando cambia el canal
      firebaseSnapshotReceivedRef.current = false
      loadMensajes()
    } else {
      setMensajes([])
    }

    // Cleanup: desuscribirse cuando cambie el canal o se desmonte
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      firebaseSnapshotReceivedRef.current = false
    }
  }, [canalSeleccionado])

  // Polling automático si Firebase no está funcionando
  // IMPORTANTE: Usar polling como respaldo incluso si Firebase está activo
  // porque Firebase puede no estar recibiendo actualizaciones de otras ventanas
  useEffect(() => {
    if (!canalSeleccionado || !usuario) return

    // Hacer polling cada 5 segundos como respaldo, incluso si Firebase está activo
    // Esto asegura que los mensajes aparezcan aunque Firebase no funcione entre pestañas
    console.log('[CHAT] 🔄 Iniciando polling de respaldo cada 5 segundos')
    const interval = setInterval(() => {
      if (!usingFirebase) {
        console.log('[CHAT] 🔄 Polling: actualizando mensajes desde API REST (Firebase no activo)...')
      } else {
        console.log('[CHAT] 🔄 Polling de respaldo: verificando nuevos mensajes (Firebase puede no estar sincronizando entre pestañas)...')
      }
      loadMensajesFallback()
    }, 5000) // Polling cada 5 segundos como respaldo

    return () => {
      console.log('[CHAT] ⏹️ Deteniendo polling automático')
      clearInterval(interval)
    }
  }, [canalSeleccionado, usuario])

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

  // Cargar mensajes con Firebase o fallback a API
  const loadMensajes = async () => {
    if (!canalSeleccionado) return

    // Limpiar suscripción anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    // Verificar configuración de Firebase
    const firebaseConfigurado = isFirebaseConfigured()
    console.log('[CHAT] Firebase configurado:', firebaseConfigurado)
    console.log('[CHAT] Variables Firebase:', {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Presente' : '❌ Faltante',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Presente' : '❌ Faltante',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Presente' : '❌ Faltante'
    })

    // Intentar usar Firebase si está configurado
    if (firebaseConfigurado) {
      console.log('[CHAT] Intentando conectar a Firebase...')
      // NO establecer usingFirebase = true todavía - esperar a que Firebase reciba un snapshot
      // Esto permite que el polling se inicie como respaldo
      setUsingFirebase(false)
      
      // Cargar mensajes iniciales desde API mientras se establece la suscripción
      loadMensajesFallback()
      
      // Resetear el flag de snapshot recibido
      firebaseSnapshotReceivedRef.current = false
      
      console.log('[CHAT] 🔗 Creando suscripción a Firebase para canal:', canalSeleccionado.id)
      console.log('[CHAT] 📡 Esta ventana se suscribirá a actualizaciones en tiempo real')
      console.log('[CHAT] 🆔 ID de ventana:', window.location.href)
      console.log('[CHAT] 🕐 Timestamp:', new Date().toISOString())
      
      const unsubscribe = subscribeToChannelMessages(
        canalSeleccionado.id,
        (mensajes) => {
          // Log importante: confirmar que ESTA ventana está recibiendo actualizaciones
          console.log('[CHAT] 📨📨📨 ACTUALIZACIÓN RECIBIDA EN ESTA VENTANA -', mensajes.length, 'mensajes')
          console.log('[CHAT] 🆔 Ventana:', window.location.href)
          console.log('[CHAT] 🕐 Timestamp:', new Date().toISOString())
          
          // Marcar que se recibió al menos un snapshot - Firebase está funcionando
          firebaseSnapshotReceivedRef.current = true
          
          // IMPORTANTE: Confirmar que Firebase está activo para detener el polling
          // Usar función de callback para asegurar actualización correcta del estado
          setUsingFirebase((prev) => {
            if (!prev) {
              console.log('[CHAT] ✅ Firebase confirmado funcionando, deteniendo polling')
              console.log('[CHAT] 🛑 Cambiando usingFirebase: false → true')
            }
            return true // Siempre establecer en true cuando Firebase funciona
          })
          
          console.log('[CHAT] ⚡ Mensajes recibidos de Firebase (tiempo real):', mensajes.length)
          console.log('[CHAT] 📝 IDs de mensajes:', mensajes.map(m => m.id))
          
          // IMPORTANTE: SIEMPRE actualizar con mensajes de Firebase cuando hay cambios
          // Esto asegura que los nuevos mensajes aparezcan en tiempo real en todas las ventanas
          setMensajes((mensajesActuales) => {
            console.log('[CHAT] 🔄 Procesando actualización de mensajes:', {
              mensajesFirebase: mensajes.length,
              mensajesActuales: mensajesActuales?.length || 0,
              idsFirebase: mensajes.map(m => m.id),
              idsActuales: mensajesActuales?.map(m => m.id) || []
            })
            
            if (mensajes.length > 0) {
              // Si Firebase tiene mensajes, combinarlos con los existentes para mantener historial completo
              // Pero priorizar Firebase para mensajes nuevos (tiempo real)
              const mensajesFirebaseIds = new Set(mensajes.map(m => m.id))
              const mensajesAntiguos = mensajesActuales?.filter(m => {
                // Solo mantener mensajes antiguos que NO están en Firebase
                // Esto evita duplicados y asegura que los mensajes de Firebase (tiempo real) tengan prioridad
                const noEstaEnFirebase = !mensajesFirebaseIds.has(m.id)
                if (!noEstaEnFirebase) {
                  console.log('[CHAT] 🔄 Mensaje duplicado detectado, usando versión de Firebase:', m.id)
                }
                return noEstaEnFirebase
              }) || []
              
              // Combinar: mensajes antiguos (del fallback) + mensajes nuevos (de Firebase)
              const mensajesCombinados = [...mensajesAntiguos, ...mensajes]
              
              // Ordenar por fecha
              mensajesCombinados.sort((a, b) => {
                return new Date(a.fechaEnvio).getTime() - new Date(b.fechaEnvio).getTime()
              })
              
              console.log('[CHAT] ✅ Actualizando mensajes en tiempo real:', {
                antiguos: mensajesAntiguos.length,
                nuevos: mensajes.length,
                total: mensajesCombinados.length,
                idsNuevos: mensajes.map(m => m.id),
                timestamp: new Date().toISOString()
              })
              
              // Forzar actualización del estado
              return mensajesCombinados
            } else {
              // Si Firebase está vacío, mantener los mensajes actuales (del fallback)
              // PERO solo si ya tenemos mensajes, para no perder el historial
              if (mensajesActuales && mensajesActuales.length > 0) {
                console.log('[CHAT] ℹ️ Firebase vacío, manteniendo mensajes existentes:', mensajesActuales.length)
                return mensajesActuales
              } else {
                // Si ambos están vacíos, usar el array vacío
                console.log('[CHAT] ℹ️ Firebase y fallback vacíos')
                return mensajes
              }
            }
          })
          
          // Forzar scroll al final después de actualizar mensajes
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
            }
          }, 100)
          console.log('[CHAT] ✅ Estado actualizado')
        },
        (error) => {
          console.error('[CHAT] ❌ Error en Firebase:', error)
          console.error('[CHAT] Detalles del error:', error)
          console.warn('[CHAT] 🔄 Cambiando a modo polling (Firebase bloqueado o no disponible)')
          setUsingFirebase(false)
          // El fallback ya se cargó, el polling se iniciará automáticamente
        }
      )
      
      if (unsubscribe) {
        console.log('[CHAT] ✅ Suscripción a Firebase activa')
        unsubscribeRef.current = unsubscribe
        
        // Verificar si Firebase está realmente funcionando después de 10 segundos
        // Solo cambiar a polling si NO se recibió ningún snapshot
        const firebaseCheckTimeout = setTimeout(() => {
          if (!firebaseSnapshotReceivedRef.current) {
            console.warn('[CHAT] ⚠️ Firebase no está recibiendo snapshots después de 10 segundos')
            console.warn('[CHAT] 🔄 Cambiando automáticamente a modo polling cada 3 segundos')
            setUsingFirebase(false)
            // El polling se iniciará automáticamente por el useEffect
          } else {
            console.log('[CHAT] ✅ Firebase está funcionando correctamente, recibiendo actualizaciones en tiempo real')
            console.log('[CHAT] 🛑 Polling debería estar detenido ahora')
            // Asegurar que Firebase está marcado como activo
            setUsingFirebase(true)
          }
        }, 10000) // Aumentar a 10 segundos para dar más tiempo a Firebase
        
        // Limpiar timeout cuando se desmonte o cambie el canal
        return () => {
          clearTimeout(firebaseCheckTimeout)
        }
      } else {
        console.warn('[CHAT] ⚠️ No se pudo crear suscripción a Firebase, usando solo API REST')
        setUsingFirebase(false)
      }
    } else {
      console.warn('[CHAT] Firebase no configurado, usando API REST (polling)')
    }

    // Fallback a API REST
    setUsingFirebase(false)
    loadMensajesFallback()
  }

  const loadMensajesFallback = async () => {
    if (!canalSeleccionado) return

    try {
      console.log('[CHAT] Cargando mensajes desde API REST (fallback)')
      const headers = getAuthHeaders()
      const response = await fetch(`/api/mensajes?canalId=${canalSeleccionado.id}&limit=100`, { headers })
      const data = await response.json()

      if (data.success) {
        console.log('[CHAT] Mensajes cargados desde API:', data.data.length)
        // Los mensajes ya vienen ordenados por fecha descendente, invertir para mostrar más antiguos primero
        setMensajes(data.data.reverse())
      } else {
        console.error('[CHAT] Error al cargar mensajes:', data.error)
        toast.error(data.error || 'Error al cargar mensajes')
      }
    } catch (error) {
      console.error('[CHAT] Error al cargar mensajes:', error)
      toast.error('Error de conexión al cargar mensajes')
    }
  }

  const sendMessage = async () => {
    if (!canalSeleccionado || !usuario || (!nuevoMensaje.trim() && !archivoAdjunto)) return

    const contenido = nuevoMensaje.trim() || (archivoAdjunto ? `Archivo: ${archivoAdjunto.file.name}` : '')
    
    try {
      // Intentar usar Firebase si está configurado
      if (isFirebaseConfigured() && usingFirebase) {
        console.log('[CHAT] 📤 Enviando mensaje a Firebase...')
        const mensajeId = await sendMessageToFirebase(
          contenido,
          canalSeleccionado.id,
          usuario.id,
          {
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            rol: usuario.rol
          },
          archivoAdjunto?.url,
          archivoAdjunto?.tipo,
          archivoAdjunto?.file.name
        )

        if (mensajeId) {
          console.log('[CHAT] ✅ Mensaje enviado a Firebase, ID:', mensajeId)
          console.log('[CHAT] ⏳ Esperando actualización del snapshot...')
          setNuevoMensaje('')
          setArchivoAdjunto(null)
          // No hacer return aquí, dejar que el snapshot actualice automáticamente
          return
        } else {
          console.warn('[CHAT] ⚠️ No se pudo enviar a Firebase, usando fallback')
        }
      }

      // Fallback a API REST
      const token = getAuthToken()
      const messageData: any = {
        contenido: contenido || undefined,
        canalId: canalSeleccionado.id
      }

      if (archivoAdjunto) {
        messageData.archivoUrl = archivoAdjunto.url
        messageData.tipoArchivo = archivoAdjunto.tipo
        messageData.nombreArchivo = archivoAdjunto.file.name
      } else {
        // No enviar campos de archivo si no hay archivo
        messageData.archivoUrl = undefined
        messageData.tipoArchivo = undefined
        messageData.nombreArchivo = undefined
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
        await loadMensajesFallback()
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-gray-50, 248, 250, 252))' }}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!usuario) {
    return null
  }

  return (
    <div className="flex h-screen text-primary overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
      {/* Sidebar Izquierda - Categorías */}
      <div className="w-16 flex flex-col items-center py-4 space-y-4" style={{ backgroundColor: 'rgb(var(--color-gray-800))' }}>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-12 h-12 rounded-lg flex items-center justify-center transition"
          style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'
          }}
          title="Volver al Dashboard"
        >
          <UserGroupIcon className="h-6 w-6 text-on-color" />
        </button>
        
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center transition cursor-pointer" 
          title="General"
          style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'
          }}
        >
          <HashtagIcon className="h-6 w-6 text-on-color" />
        </div>
        
        {sucursales.length > 0 && (
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center transition cursor-pointer" 
            title="Sucursales"
            style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'
            }}
          >
            <BuildingOfficeIcon className="h-6 w-6 text-on-color" />
          </div>
        )}
        
        {maquinaria.length > 0 && (
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center transition cursor-pointer" 
            title="Equipos"
            style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'
            }}
          >
            <CpuChipIcon className="h-6 w-6 text-on-color" />
          </div>
        )}
      </div>

      {/* Lista de Canales */}
      <div className="w-60 flex flex-col" style={{ backgroundColor: 'rgb(var(--color-gray-700))' }}>
        <div className="p-4 border-b" style={{ borderColor: 'rgb(var(--color-gray-600))' }}>
          <h2 className="text-sm font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>CANALES</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Canales GENERAL */}
          {canalesPorCategoria.GENERAL.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-semibold text-tertiary uppercase flex items-center justify-between">
                <span>General</span>
              </div>
              {canalesPorCategoria.GENERAL.map(canal => (
                <div
                  key={canal.id}
                  className="group flex items-center justify-between px-2 py-1 rounded cursor-pointer"
                  style={{
                    backgroundColor: canalSeleccionado?.id === canal.id 
                      ? 'rgb(var(--color-gray-200))' 
                      : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (canalSeleccionado?.id !== canal.id) {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-200))'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canalSeleccionado?.id !== canal.id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                  onClick={() => setCanalSeleccionado(canal)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <HashtagIcon className="h-4 w-4 text-tertiary flex-shrink-0" />
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
                      className="p-1 rounded"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                    {canal.categoria !== 'GENERAL' || canal.nombre.toLowerCase() !== 'general' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEliminarCanal(canal)
                        }}
                        className="p-1 rounded text-red-400"
                        style={{ backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
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
              <div className="px-2 py-1 text-xs font-semibold text-tertiary uppercase flex items-center justify-between mt-4">
                <span>Sucursales</span>
              </div>
              {canalesPorCategoria.SUCURSAL.map(canal => (
                <div
                  key={canal.id}
                  className="group flex items-center justify-between px-2 py-1 rounded cursor-pointer"
                  style={{
                    backgroundColor: canalSeleccionado?.id === canal.id 
                      ? 'rgb(var(--color-gray-200))' 
                      : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (canalSeleccionado?.id !== canal.id) {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-200))'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canalSeleccionado?.id !== canal.id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                  onClick={() => setCanalSeleccionado(canal)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <HashtagIcon className="h-4 w-4 text-tertiary flex-shrink-0" />
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
                      className="p-1 rounded"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEliminarCanal(canal)
                      }}
                      className="p-1 rounded text-red-400"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
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
              <div className="px-2 py-1 text-xs font-semibold text-tertiary uppercase flex items-center justify-between mt-4">
                <span>Equipos</span>
              </div>
              {canalesPorCategoria.EQUIPO.map(canal => (
                <div
                  key={canal.id}
                  className="group flex items-center justify-between px-2 py-1 rounded cursor-pointer"
                  style={{
                    backgroundColor: canalSeleccionado?.id === canal.id 
                      ? 'rgb(var(--color-gray-200))' 
                      : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (canalSeleccionado?.id !== canal.id) {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-200))'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canalSeleccionado?.id !== canal.id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                  onClick={() => setCanalSeleccionado(canal)}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <HashtagIcon className="h-4 w-4 text-tertiary flex-shrink-0" />
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
                      className="p-1 rounded"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEliminarCanal(canal)
                      }}
                      className="p-1 rounded text-red-400"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
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
            className="w-full mt-2 px-2 py-1.5 text-sm text-secondary hover:text-primary rounded flex items-center space-x-2"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-200))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <PlusIcon className="h-4 w-4" />
            <span style={{ color: 'var(--color-text-secondary)' }}>Crear Canal</span>
          </button>
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col">
        {canalSeleccionado ? (
          <>
            {/* Header del canal */}
            <div className="h-12 border-b flex items-center justify-between px-4 shadow-sm" style={{ backgroundColor: 'rgb(var(--color-gray-50))', borderColor: 'rgb(var(--color-gray-300))' }}>
              <div className="flex items-center space-x-2">
                <HashtagIcon className="h-5 w-5 text-tertiary" />
                <h2 className="font-semibold">{canalSeleccionado.nombre}</h2>
                {canalSeleccionado.descripcion && (
                  <span className="text-sm text-tertiary">- {canalSeleccionado.descripcion}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  className="p-1.5 rounded"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <Cog6ToothIcon className="h-5 w-5 text-tertiary" />
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mensajes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <p className="text-tertiary text-lg mb-2">No hay mensajes aún</p>
                  <p className="text-tertiary text-sm">Sé el primero en escribir en este canal</p>
                </div>
              ) : (
                mensajes.map((mensaje) => (
                <div 
                  key={mensaje.id} 
                  className="flex items-start space-x-3 group rounded p-2 -m-2"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-200))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
                    <span className="text-sm font-semibold">
                      {mensaje.remitente.nombre[0]}{mensaje.remitente.apellido[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold">{mensaje.remitente.nombre} {mensaje.remitente.apellido}</span>
                      <span className="text-xs text-tertiary">
                        {new Date(mensaje.fechaEnvio).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {mensaje.editado && (
                        <span className="text-xs text-tertiary italic">(editado)</span>
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
                            className="flex items-center space-x-2 p-2 rounded"
                            style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-200))'
                            }}
                          >
                            <PaperClipIcon className="h-4 w-4" />
                            <span className="text-sm">{mensaje.nombreArchivo || 'Archivo'}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {mensaje.contenido && (
                      <p className="text-primary">{mensaje.contenido}</p>
                    )}
                  </div>
                </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <div className="p-4 border-t border-gray-300">
              {archivoAdjunto && (
                <div className="mb-2 p-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}>
                  <div className="flex items-center space-x-2">
                    <PaperClipIcon className="h-4 w-4 text-[#5865f2]" />
                    <span className="text-sm truncate">{archivoAdjunto.file.name}</span>
                  </div>
                  <button
                    onClick={() => setArchivoAdjunto(null)}
                    className="text-tertiary hover:text-primary"
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
                  className="p-2 text-tertiary hover:text-primary rounded"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
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
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={`Mensaje #${canalSeleccionado.nombre}`}
                  className="flex-1 text-primary px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!nuevoMensaje.trim() && !archivoAdjunto}
                  className="p-2 text-on-color rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'
                    }
                  }}
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <HashtagIcon className="h-16 w-16 text-tertiary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Selecciona un canal</h2>
              <p className="text-tertiary">Elige un canal de la lista para comenzar a chatear</p>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {showModalCrearCanal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-full max-w-md" style={{ backgroundColor: 'rgb(var(--color-gray-800))' }}>
            <h3 className="text-xl font-semibold mb-4 text-primary">Crear Canal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-secondary">Nombre</label>
                <input
                  type="text"
                  value={formCanal.nombre}
                  onChange={(e) => setFormCanal({ ...formCanal, nombre: e.target.value })}
                  className="w-full text-primary px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
                  placeholder="nombre-del-canal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-secondary">Descripción (opcional)</label>
                <input
                  type="text"
                  value={formCanal.descripcion}
                  onChange={(e) => setFormCanal({ ...formCanal, descripcion: e.target.value })}
                  className="w-full text-primary px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
                  placeholder="Descripción del canal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-secondary">Categoría</label>
                <select
                  value={formCanal.categoria}
                  onChange={(e) => setFormCanal({ ...formCanal, categoria: e.target.value as any, sucursalId: '', equipoId: '' })}
                  className="w-full text-primary px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
                >
                  <option value="GENERAL">General</option>
                  <option value="SUCURSAL">Sucursal</option>
                  <option value="EQUIPO">Equipo</option>
                </select>
              </div>
              {formCanal.categoria === 'SUCURSAL' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-secondary">Sucursal</label>
                  <select
                    value={formCanal.sucursalId}
                    onChange={(e) => setFormCanal({ ...formCanal, sucursalId: e.target.value })}
                    className="w-full text-primary px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
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
                  <label className="block text-sm font-medium mb-2 text-secondary">Equipo</label>
                  <select
                    value={formCanal.equipoId}
                    onChange={(e) => setFormCanal({ ...formCanal, equipoId: e.target.value })}
                    className="w-full text-primary px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
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
                className="px-4 py-2 rounded"
                style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-200))'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearCanal}
                className="px-4 py-2 rounded"
                style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'
                }}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalEditarCanal && canalEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-full max-w-md" style={{ backgroundColor: 'rgb(var(--color-gray-800))' }}>
            <h3 className="text-xl font-semibold mb-4 text-primary">Editar Canal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-secondary">Nombre</label>
                <input
                  type="text"
                  value={formCanal.nombre}
                  onChange={(e) => setFormCanal({ ...formCanal, nombre: e.target.value })}
                  className="w-full text-primary px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-secondary">Descripción (opcional)</label>
                <input
                  type="text"
                  value={formCanal.descripcion}
                  onChange={(e) => setFormCanal({ ...formCanal, descripcion: e.target.value })}
                  className="w-full text-primary px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowModalEditarCanal(false)
                  setCanalEditando(null)
                }}
                className="px-4 py-2 rounded"
                style={{ backgroundColor: 'rgb(var(--color-gray-200))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-300))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-gray-200))'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEditarCanal}
                className="px-4 py-2 rounded"
                style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'
                }}
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

