import { Server as NetServer } from 'http'
import { NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'
import { verifyToken } from './auth'
import { setIOInstance } from './notifications'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO
    }
  }
}

export const SocketHandler = (req: any, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    console.log('Socket is already running')
  } else {
    console.log('Socket is initializing')
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL 
          : 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    })

    // Configurar instancia de IO para notificaciones
    setIOInstance(io)

    // Middleware de autenticación
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
        
        if (!token) {
          return next(new Error('Token requerido'))
        }

        const payload = verifyToken(token)
        if (!payload) {
          return next(new Error('Token inválido'))
        }

        // Agregar información del usuario al socket
        socket.data.user = {
          id: payload.userId,
          email: payload.email,
          rol: payload.rol,
          sucursales: payload.sucursales
        }

        next()
      } catch (error) {
        next(new Error('Error de autenticación'))
      }
    })

    io.on('connection', (socket) => {
      console.log(`Usuario conectado: ${socket.data.user.email}`)

      // Unirse a salas según las sucursales del usuario
      socket.data.user.sucursales.forEach((sucursalId: string) => {
        socket.join(`sucursal_${sucursalId}`)
      })

      // Unirse a sala general
      socket.join('general')

      // Unirse a sala privada del usuario
      socket.join(`user_${socket.data.user.id}`)

      // Manejar mensajes
      socket.on('send_message', async (data) => {
        try {
          const { contenido, tipo, sucursalId, destinatarioId, archivoUrl, tipoArchivo, nombreArchivo } = data

          // Validar datos
          if ((!contenido || contenido.trim() === '') && !archivoUrl) {
            socket.emit('error', { message: 'Datos inválidos' })
            return
          }

          // Validar permisos según el tipo de mensaje
          if (tipo === 'SUCURSAL' && sucursalId) {
            if (!socket.data.user.sucursales.includes(sucursalId) && socket.data.user.rol !== 'SUPER_ADMIN') {
              socket.emit('error', { message: 'Sin acceso a esta sucursal' })
              return
            }
          }

          // Emitir mensaje a las salas correspondientes
          const messageData = {
            id: `temp_${Date.now()}`,
            contenido: contenido || (archivoUrl ? `Archivo: ${nombreArchivo || 'archivo'}` : ''),
            tipo,
            archivoUrl,
            tipoArchivo,
            nombreArchivo,
            sucursalId,
            destinatarioId,
            remitente: {
              id: socket.data.user.id,
              nombre: socket.data.user.nombre || 'Usuario',
              apellido: socket.data.user.apellido || '',
              rol: socket.data.user.rol
            },
            fechaEnvio: new Date().toISOString(),
            leido: false
          }

          switch (tipo) {
            case 'GENERAL':
              io.to('general').emit('new_message', messageData)
              break
            case 'SUCURSAL':
              if (sucursalId) {
                io.to(`sucursal_${sucursalId}`).emit('new_message', messageData)
              }
              break
            case 'PRIVADO':
              if (destinatarioId) {
                io.to(`user_${destinatarioId}`).emit('new_message', messageData)
                socket.emit('new_message', messageData) // También al remitente
              }
              break
          }

          // Confirmar envío
          socket.emit('message_sent', { success: true })

        } catch (error) {
          console.error('Error al enviar mensaje:', error)
          socket.emit('error', { message: 'Error al enviar mensaje' })
        }
      })

      // Manejar typing indicators
      socket.on('typing_start', (data) => {
        const { tipo, sucursalId, destinatarioId } = data
        
        const typingData = {
          userId: socket.data.user.id,
          nombre: socket.data.user.nombre || 'Usuario',
          tipo,
          sucursalId,
          destinatarioId
        }

        switch (tipo) {
          case 'GENERAL':
            socket.to('general').emit('user_typing', typingData)
            break
          case 'SUCURSAL':
            if (sucursalId) {
              socket.to(`sucursal_${sucursalId}`).emit('user_typing', typingData)
            }
            break
          case 'PRIVADO':
            if (destinatarioId) {
              socket.to(`user_${destinatarioId}`).emit('user_typing', typingData)
            }
            break
        }
      })

      socket.on('typing_stop', (data) => {
        const { tipo, sucursalId, destinatarioId } = data
        
        const typingData = {
          userId: socket.data.user.id,
          tipo,
          sucursalId,
          destinatarioId
        }

        switch (tipo) {
          case 'GENERAL':
            socket.to('general').emit('user_stopped_typing', typingData)
            break
          case 'SUCURSAL':
            if (sucursalId) {
              socket.to(`sucursal_${sucursalId}`).emit('user_stopped_typing', typingData)
            }
            break
          case 'PRIVADO':
            if (destinatarioId) {
              socket.to(`user_${destinatarioId}`).emit('user_stopped_typing', typingData)
            }
            break
        }
      })

      // Manejar desconexión
      socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.data.user.email}`)
      })
    })

    res.socket.server.io = io
  }
  res.end()
}
