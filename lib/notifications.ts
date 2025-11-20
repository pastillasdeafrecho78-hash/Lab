import { sendComandaCompletadaEmail, sendComandaCreadaEmail } from './email'

// Socket.IO removido - usando Firebase para chat en su lugar

export interface NotificationData {
  type: 'comanda_creada' | 'comanda_actualizada' | 'resultado_completado' | 'comanda_completada'
  title: string
  message: string
  comandaId?: string
  sucursalId?: string
  userId?: string
  timestamp: Date
}

/**
 * Emite una notificación a los usuarios relevantes
 * Nota: Socket.IO removido - las notificaciones ahora se manejan vía Firebase o API
 */
export async function emitNotification(notification: NotificationData) {
  // Socket.IO removido - implementar con Firebase o sistema de notificaciones alternativo si es necesario
  console.log('Notificación:', notification)
}

/**
 * Notifica cuando se crea una nueva comanda
 */
export async function notificarComandaCreada(
  comandaId: string,
  sucursalId: string,
  clienteNombre: string,
  clienteEmail?: string,
  numeroComanda?: string
) {
  await emitNotification({
    type: 'comanda_creada',
    title: 'Nueva Comanda',
    message: `Se creó una nueva comanda para ${clienteNombre}`,
    comandaId,
    sucursalId,
    timestamp: new Date()
  })

  // Enviar email si está disponible
  if (clienteEmail && numeroComanda) {
    await sendComandaCreadaEmail(clienteEmail, clienteNombre, numeroComanda)
  }
}

/**
 * Notifica cuando se actualiza el estado de una comanda
 */
export async function notificarComandaActualizada(
  comandaId: string,
  sucursalId: string,
  estadoAnterior: string,
  estadoNuevo: string,
  clienteNombre: string
) {
  const mensajesEstado: Record<string, string> = {
    'EN_PROCESO': 'en proceso',
    'COMPLETADA': 'completada',
    'ENTREGADA': 'entregada',
    'CANCELADA': 'cancelada'
  }

  await emitNotification({
    type: 'comanda_actualizada',
    title: 'Comanda Actualizada',
    message: `La comanda de ${clienteNombre} cambió de ${estadoAnterior} a ${mensajesEstado[estadoNuevo] || estadoNuevo}`,
    comandaId,
    sucursalId,
    timestamp: new Date()
  })

  // Si se completó, emitir notificación especial
  if (estadoNuevo === 'COMPLETADA') {
    await emitNotification({
      type: 'comanda_completada',
      title: 'Comanda Completada',
      message: `La comanda de ${clienteNombre} está lista para entrega`,
      comandaId,
      sucursalId,
      timestamp: new Date()
    })
  }
}

/**
 * Notifica cuando se completan resultados
 */
export async function notificarResultadosCompletados(
  comandaId: string,
  sucursalId: string,
  clienteNombre: string,
  clienteEmail?: string,
  numeroComanda?: string
) {
  await emitNotification({
    type: 'resultado_completado',
    title: 'Resultados Listos',
    message: `Los resultados de ${clienteNombre} están listos`,
    comandaId,
    sucursalId,
    timestamp: new Date()
  })

  // Enviar email si está disponible
  if (clienteEmail && numeroComanda) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const pdfUrl = `${baseUrl}/api/comandas/${comandaId}/pdf?tipo=resultados`
    await sendComandaCompletadaEmail(clienteEmail, clienteNombre, numeroComanda, pdfUrl)
  }
}

