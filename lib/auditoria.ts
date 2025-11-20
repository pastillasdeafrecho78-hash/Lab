import { prisma } from './prisma'
import { Rol } from '@prisma/client'

export interface AuditoriaData {
  usuarioId: string
  accion: string
  tabla: string
  registroId?: string
  datosAnteriores?: any
  datosNuevos?: any
  ip?: string
  userAgent?: string
  dispositivo?: string
}

export async function registrarAuditoria(data: AuditoriaData) {
  try {
    await prisma.auditoria.create({
      data: {
        usuarioId: data.usuarioId,
        accion: data.accion,
        tabla: data.tabla,
        registroId: data.registroId,
        datosAnteriores: data.datosAnteriores,
        datosNuevos: data.datosNuevos,
        ip: data.ip,
        userAgent: data.userAgent,
        dispositivo: data.dispositivo
      }
    })
  } catch (error) {
    console.error('Error al registrar auditoría:', error)
    // No lanzar error para no interrumpir el flujo principal
  }
}

export function getAccionAuditoria(operacion: string, tabla: string): string {
  const acciones = {
    CREATE: `CREAR_${tabla.toUpperCase()}`,
    UPDATE: `ACTUALIZAR_${tabla.toUpperCase()}`,
    DELETE: `ELIMINAR_${tabla.toUpperCase()}`,
    LOGIN: 'INICIO_SESION',
    LOGOUT: 'CIERRE_SESION',
    VIEW: `CONSULTAR_${tabla.toUpperCase()}`
  }
  
  return acciones[operacion as keyof typeof acciones] || operacion
}

export function sanitizeDataForAudit(data: any): any {
  if (!data) return data
  
  // Remover campos sensibles
  const sensitiveFields = ['password', 'token', 'secret']
  const sanitized = { ...data }
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  })
  
  return sanitized
}
