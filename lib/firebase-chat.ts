import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  Timestamp,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore'
import { getFirestoreDB } from './firebase'
import { isFirebaseConfigured } from './firebase'
import { getAuthToken } from './api-helpers'

interface MensajeFirebase {
  id: string
  contenido: string
  canalId: string
  remitenteId: string
  remitente?: {
    nombre: string
    apellido: string
    rol: string
  }
  archivoUrl?: string
  tipoArchivo?: string
  nombreArchivo?: string
  editado: boolean
  eliminado: boolean
  fechaEnvio: Timestamp
  createdAt: Timestamp
}

interface MensajeFormatted {
  id: string
  contenido: string
  canalId: string
  remitenteId: string
  remitente: {
    id: string
    nombre: string
    apellido: string
    rol: string
  }
  archivoUrl?: string
  tipoArchivo?: string
  nombreArchivo?: string
  editado: boolean
  eliminado: boolean
  fechaEnvio: string
}

// Sincronizar mensaje de Firebase con PostgreSQL
const syncMessageToPostgreSQL = async (mensaje: MensajeFirebase) => {
  try {
    const token = getAuthToken()
    if (!token) {
      console.warn('[FIREBASE] No hay token, omitiendo sincronización con PostgreSQL')
      return
    }

    // No verificar por ID porque Firebase y PostgreSQL usan IDs diferentes
    // Simplemente crear el mensaje en PostgreSQL (si ya existe, el backend lo manejará)
    const messageData: any = {
      contenido: mensaje.contenido || undefined,
      canalId: mensaje.canalId
    }
    
    // Solo agregar campos de archivo si existen
    if (mensaje.archivoUrl) {
      messageData.archivoUrl = mensaje.archivoUrl
      messageData.tipoArchivo = mensaje.tipoArchivo || undefined
      messageData.nombreArchivo = mensaje.nombreArchivo || undefined
    }
    
    console.log('[FIREBASE] 🔄 Sincronizando mensaje con PostgreSQL...')
    const response = await fetch('/api/mensajes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(messageData)
    })

    if (response.ok) {
      console.log('[FIREBASE] ✅ Mensaje sincronizado con PostgreSQL')
    } else {
      const errorData = await response.json().catch(() => ({}))
      // Solo loggear si no es un error de duplicado esperado
      if (response.status !== 400 && response.status !== 409) {
        console.warn('[FIREBASE] ⚠️ Error al sincronizar con PostgreSQL:', response.status, errorData)
      }
    }
  } catch (error) {
    // Silenciar errores de sincronización para no interrumpir el flujo
    console.warn('[FIREBASE] ⚠️ Error al sincronizar mensaje con PostgreSQL:', error)
  }
}

// Formatear mensaje de Firebase al formato esperado
const formatMessage = async (doc: DocumentData): Promise<MensajeFormatted> => {
  const data = doc.data() as MensajeFirebase
  
  // Obtener información del remitente si no está incluida
  let remitente = data.remitente
  if (!remitente) {
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/usuarios/${data.remitenteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const userData = await response.json()
        if (userData.success) {
          remitente = {
            nombre: userData.data.nombre,
            apellido: userData.data.apellido,
            rol: userData.data.rol
          }
        }
      }
    } catch (error) {
      console.error('Error al obtener remitente:', error)
    }
  }

  return {
    id: doc.id,
    contenido: data.contenido,
    canalId: data.canalId,
    remitenteId: data.remitenteId,
    remitente: {
      id: data.remitenteId,
      nombre: remitente?.nombre || 'Usuario',
      apellido: remitente?.apellido || '',
      rol: remitente?.rol || 'RECEPCION'
    },
    archivoUrl: data.archivoUrl,
    tipoArchivo: data.tipoArchivo,
    nombreArchivo: data.nombreArchivo,
    editado: data.editado || false,
    eliminado: data.eliminado || false,
    fechaEnvio: data.fechaEnvio?.toDate().toISOString() || new Date().toISOString()
  }
}

// Escuchar mensajes de un canal en tiempo real
export const subscribeToChannelMessages = (
  canalId: string,
  callback: (mensajes: MensajeFormatted[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null => {
  if (!isFirebaseConfigured()) {
    console.warn('[FIREBASE] Firebase no está configurado, usando polling')
    return null
  }

  try {
    console.log('[FIREBASE] 🔌 Conectando a Firestore...')
    const db = getFirestoreDB()
    console.log('[FIREBASE] ✅ Firestore DB obtenido:', db ? 'OK' : 'ERROR')
    
    // FORZAR que Firebase use la red, no el cache
    // Esto es CRÍTICO para recibir actualizaciones en tiempo real entre pestañas
    // Hacerlo de forma asíncrona sin bloquear
    enableNetwork(db).then(() => {
      console.log('[FIREBASE] ✅ Red habilitada - Firebase usará conexión en tiempo real')
    }).catch((error) => {
      console.warn('[FIREBASE] ⚠️ No se pudo habilitar red (puede estar ya habilitada):', error)
    })
    
    const messagesRef = collection(db, 'mensajes')
    console.log('[FIREBASE] 📂 Colección de mensajes obtenida')
    
    console.log('[FIREBASE] 🔔 Suscribiéndose a mensajes del canal:', canalId)
    console.log('[FIREBASE] 📍 Ruta de colección: mensajes')
    console.log('[FIREBASE] 🔍 Filtros: canalId ==', canalId, ', eliminado == false')
    
    // Primero intentar query simple sin orderBy para evitar problemas de índices
    let q = query(
      messagesRef,
      where('canalId', '==', canalId),
      where('eliminado', '==', false),
      limit(100)
    )
    
    console.log('[FIREBASE] ✅ Query creada exitosamente')
    console.log('[FIREBASE] ⏳ Esperando primer snapshot...')
    console.log('[FIREBASE] 💡 Si no ves "Snapshot recibido", verifica las reglas de Firestore')
    console.log('[FIREBASE] 🔗 Suscripción activa para canal:', canalId)
    console.log('[FIREBASE] 🌐 TODAS las ventanas deberían recibir actualizaciones en tiempo real')

    // Configurar opciones para recibir actualizaciones en tiempo real
    // IMPORTANTE: onSnapshot debe recibir el callback directamente
    // Este listener se ejecutará cada vez que haya cambios en Firestore
    console.log('[FIREBASE] 🎯 Creando listener onSnapshot...')
    console.log('[FIREBASE] 🔍 Query:', q)
    
    // IMPORTANTE: En Firebase v9, onSnapshot recibe: onSnapshot(query, callback, errorCallback)
    // NO usar opciones que puedan bloquear los snapshots
    console.log('[FIREBASE] 🎯 Creando listener onSnapshot (sin opciones bloqueantes)')
    
    const unsubscribe = onSnapshot(
      q,
      async (snapshot: QuerySnapshot<DocumentData>) => {
        // Log importante: confirmar que ESTA ventana está recibiendo snapshots
        console.log('[FIREBASE] 📡📡📡 SNAPSHOT RECIBIDO EN ESTA VENTANA - Canal:', canalId)
        console.log('[FIREBASE] 🔔 Este snapshot se ejecuta cuando hay cambios en Firestore')
        console.log('[FIREBASE] 🆔 Timestamp:', new Date().toISOString())
        console.log('[FIREBASE] 🆔 Ventana:', typeof window !== 'undefined' ? window.location.href : 'server')
        try {
          const hasPendingWrites = snapshot.metadata.hasPendingWrites
          const isFromCache = snapshot.metadata.fromCache
          const tieneCambios = snapshot.docChanges().length > 0
          
          console.log('[FIREBASE] ⚡ Snapshot recibido:', {
            totalMensajes: snapshot.docs.length,
            hasPendingWrites,
            isFromCache,
            tieneCambios,
            cambios: {
              added: snapshot.docChanges().filter(c => c.type === 'added').length,
              modified: snapshot.docChanges().filter(c => c.type === 'modified').length,
              removed: snapshot.docChanges().filter(c => c.type === 'removed').length
          }
          })
          
          // IMPORTANTE: Procesar TODOS los snapshots, incluso si vienen del cache
          // El cache puede tener datos actualizados de otras pestañas gracias a la persistencia
          
          // Log importante: confirmar que el snapshot se está ejecutando
          console.log('[FIREBASE] ✅ Callback de snapshot ejecutado correctamente')
          console.log('[FIREBASE] 📊 Estado del snapshot:', {
            docs: snapshot.docs.length,
            empty: snapshot.empty,
            metadata: {
              hasPendingWrites,
              isFromCache,
              isEqual: snapshot.metadata.isEqual
            }
          })
          
          // Log detallado de cambios
          snapshot.docChanges().forEach(change => {
            console.log('[FIREBASE] 📝 Cambio:', {
              type: change.type,
              docId: change.doc.id,
              contenido: change.doc.data().contenido?.substring(0, 30)
            })
          })
          
          // Ordenar manualmente por fechaEnvio
          const docs = snapshot.docs.sort((a, b) => {
            const fechaA = a.data().fechaEnvio?.toMillis() || 0
            const fechaB = b.data().fechaEnvio?.toMillis() || 0
            return fechaB - fechaA // Descendente
          })

          const mensajes = await Promise.all(
            docs.map(doc => formatMessage(doc))
          )
          
          // Sincronizar nuevos mensajes con PostgreSQL (solo una vez)
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              console.log('[FIREBASE] ✨ Nuevo mensaje detectado:', change.doc.id, change.doc.data().contenido?.substring(0, 50))
              const data = change.doc.data() as MensajeFirebase
              // Sincronizar en background sin bloquear
              syncMessageToPostgreSQL({ ...data, id: change.doc.id }).catch(err => {
                console.warn('[FIREBASE] Error al sincronizar mensaje:', err)
              })
            }
          })

          // Ordenar por fecha ascendente (más antiguos primero)
          mensajes.sort((a, b) => {
            return new Date(a.fechaEnvio).getTime() - new Date(b.fechaEnvio).getTime()
          })

          console.log('[FIREBASE] ✅ Mensajes formateados y ordenados:', mensajes.length)
          console.log('[FIREBASE] 📤 Llamando callback con mensajes...')
          // IMPORTANTE: Llamar al callback incluso si está vacío para confirmar que Firebase funciona
          callback(mensajes)
          console.log('[FIREBASE] ✅ Callback ejecutado con', mensajes.length, 'mensajes')
        } catch (error) {
          console.error('[FIREBASE] ❌ Error al formatear mensajes:', error)
          if (onError) onError(error as Error)
        }
      },
      (error) => {
        console.error('[FIREBASE] ❌❌❌ ERROR CRÍTICO EN SNAPSHOT:', error)
        console.error('[FIREBASE] Detalles del error:', {
          code: error.code,
          message: error.message,
          stack: error.stack,
          name: error.name
        })
        
        // Errores comunes de Firestore
        if (error.code === 'failed-precondition') {
          console.warn('[FIREBASE] ⚠️ Error de índice, la query ya está simplificada')
        } else if (error.code === 'permission-denied') {
          console.error('[FIREBASE] 🚫🚫🚫 PERMISO DENEGADO: Las reglas de Firestore están bloqueando la lectura')
          console.error('[FIREBASE] 💡 Verifica las reglas de Firestore en la consola de Firebase')
          console.error('[FIREBASE] 💡 Las reglas deben ser: allow read, write: if true;')
          console.error('[FIREBASE] 💡 Ve a: https://console.firebase.google.com/project/labalq/firestore/rules')
        } else if (error.code === 'unavailable') {
          console.error('[FIREBASE] 🔌 Firebase no está disponible (sin conexión o servicio caído)')
        } else {
          console.error('[FIREBASE] ❓ Error desconocido:', error.code)
        }
        
        if (onError) onError(error)
      }
    )

    console.log('[FIREBASE] ✅ Suscripción creada exitosamente')
    console.log('[FIREBASE] 📋 Listener activo - Este listener se ejecutará cada vez que haya cambios')
    console.log('[FIREBASE] 🔄 Si otra ventana envía un mensaje, ESTA ventana debería recibir un snapshot')
    console.log('[FIREBASE] 🆔 Unsubscribe es función:', typeof unsubscribe === 'function')
    
    // Verificar que el unsubscribe es una función válida
    if (typeof unsubscribe !== 'function') {
      console.error('[FIREBASE] ❌ ERROR: unsubscribe no es una función válida')
      return null
    }
    
    // Agregar un listener de prueba para verificar que el listener está activo
    console.log('[FIREBASE] 🧪 TEST: Listener creado, esperando snapshots...')
    
    // Verificar la conexión de Firestore
    setTimeout(() => {
      console.log('[FIREBASE] 🧪 TEST: Verificando conexión después de 2 segundos...')
      console.log('[FIREBASE] 🧪 TEST: Si no ves snapshots, puede haber un problema de conexión')
    }, 2000)
    
    return unsubscribe
  } catch (error) {
    console.error('Error al suscribirse a mensajes:', error)
    if (onError) onError(error as Error)
    return null
  }
}

// Enviar mensaje a Firebase
export const sendMessageToFirebase = async (
  contenido: string,
  canalId: string,
  remitenteId: string,
  remitente: { nombre: string; apellido: string; rol: string },
  archivoUrl?: string,
  tipoArchivo?: string,
  nombreArchivo?: string
): Promise<string | null> => {
  if (!isFirebaseConfigured()) {
    // Fallback a API REST si Firebase no está configurado
    try {
      const token = getAuthToken()
      const response = await fetch('/api/mensajes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contenido: contenido || undefined,
          canalId,
          archivoUrl: archivoUrl || undefined,
          tipoArchivo: tipoArchivo || undefined,
          nombreArchivo: nombreArchivo || undefined
        })
      })
      const data = await response.json()
      return data.success ? data.data.id : null
    } catch (error) {
      console.error('Error al enviar mensaje vía API:', error)
      return null
    }
  }

  try {
    const db = getFirestoreDB()
    const messagesRef = collection(db, 'mensajes')
    
    const nuevoMensaje = {
      contenido,
      canalId,
      remitenteId,
      remitente,
      archivoUrl: archivoUrl || null,
      tipoArchivo: tipoArchivo || null,
      nombreArchivo: nombreArchivo || null,
      editado: false,
      eliminado: false,
      fechaEnvio: Timestamp.now(),
      createdAt: Timestamp.now()
    }

    console.log('[FIREBASE] 📤 Enviando mensaje a Firestore:', {
      contenido: contenido.substring(0, 50),
      canalId,
      remitenteId
    })
    
    const docRef = await addDoc(messagesRef, nuevoMensaje)
    
    console.log('[FIREBASE] ✅ Mensaje guardado en Firestore con ID:', docRef.id)
    console.log('[FIREBASE] 🔄 El snapshot debería actualizarse automáticamente...')
    
    // Sincronizar con PostgreSQL (en background, no bloquear)
    syncMessageToPostgreSQL({ ...nuevoMensaje, id: docRef.id }).catch(err => {
      console.warn('[FIREBASE] Error al sincronizar con PostgreSQL:', err)
    })
    
    return docRef.id
  } catch (error) {
    console.error('Error al enviar mensaje a Firebase:', error)
    return null
  }
}

// Editar mensaje en Firebase
export const editMessageInFirebase = async (
  mensajeId: string,
  nuevoContenido: string
): Promise<boolean> => {
  if (!isFirebaseConfigured()) {
    return false
  }

  try {
    const db = getFirestoreDB()
    const messageRef = doc(db, 'mensajes', mensajeId)
    
    await updateDoc(messageRef, {
      contenido: nuevoContenido,
      editado: true
    })

    return true
  } catch (error) {
    console.error('Error al editar mensaje:', error)
    return false
  }
}

// Eliminar mensaje en Firebase (soft delete)
export const deleteMessageInFirebase = async (
  mensajeId: string
): Promise<boolean> => {
  if (!isFirebaseConfigured()) {
    return false
  }

  try {
    const db = getFirestoreDB()
    const messageRef = doc(db, 'mensajes', mensajeId)
    
    await updateDoc(messageRef, {
      eliminado: true
    })

    return true
  } catch (error) {
    console.error('Error al eliminar mensaje:', error)
    return false
  }
}

