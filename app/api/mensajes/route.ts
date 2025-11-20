import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const mensajeSchema = z.object({
  contenido: z.string().min(1, 'Contenido es requerido').optional(),
  canalId: z.string().min(1, 'Canal es requerido'),
  archivoUrl: z.string().url().optional(),
  tipoArchivo: z.string().optional(),
  nombreArchivo: z.string().optional(),
  // Campos legacy para compatibilidad
  tipo: z.enum(['SUCURSAL', 'GENERAL', 'PRIVADO']).optional(),
  sucursalId: z.string().optional(),
  destinatarioId: z.string().optional()
}).refine(
  (data) => data.contenido || data.archivoUrl,
  {
    message: 'Debe proporcionar contenido o archivo',
    path: ['contenido']
  }
)

// GET - Obtener mensajes
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { searchParams } = new URL(request.url)
    const canalId = searchParams.get('canalId')
    // Parámetros legacy para compatibilidad
    const tipo = searchParams.get('tipo')
    const sucursalId = searchParams.get('sucursalId')
    const destinatarioId = searchParams.get('destinatarioId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {
      eliminado: false
    }

    // Priorizar canalId sobre tipo legacy
    if (canalId) {
      // Verificar permisos del canal
      const canal = await prisma.canal.findUnique({
        where: { id: canalId },
        include: { permisos: true }
      })

      if (!canal || !canal.activo) {
        return NextResponse.json(
          { success: false, error: 'Canal no encontrado' },
          { status: 404 }
        )
      }

      // Verificar permisos
      if (user.rol !== 'SUPER_ADMIN') {
        const permiso = await prisma.canalPermiso.findUnique({
          where: {
            canalId_rol: {
              canalId: canalId,
              rol: user.rol
            }
          }
        })

        if (!permiso || !permiso.puedeVer) {
          // Verificar si es canal general o de su sucursal
          if (canal.categoria !== 'GENERAL' && 
              (canal.categoria !== 'SUCURSAL' || !user.sucursales.some(s => s.id === canal.sucursalId))) {
            return NextResponse.json(
              { success: false, error: 'Sin permisos para ver este canal' },
              { status: 403 }
            )
          }
        }
      }

      where.canalId = canalId
    } else {
      // Filtros legacy para compatibilidad
      if (tipo) {
        where.tipo = tipo
      }

      if (sucursalId) {
        where.sucursalId = sucursalId
      }

      if (destinatarioId) {
        where.destinatarioId = destinatarioId
      }

      // Filtrar mensajes según permisos del usuario
      if (user.rol !== 'SUPER_ADMIN') {
        const userSucursales = user.sucursales.map(s => s.id)
        
        where.OR = [
          // Mensajes generales
          { tipo: 'GENERAL' },
          // Mensajes de sucursales del usuario
          { 
            tipo: 'SUCURSAL',
            sucursalId: { in: userSucursales }
          },
          // Mensajes privados donde el usuario es remitente o destinatario
          {
            tipo: 'PRIVADO',
            OR: [
              { remitenteId: user.id },
              { destinatarioId: user.id }
            ]
          }
        ]
      }
    }

    const [mensajes, total] = await Promise.all([
      prisma.mensaje.findMany({
        where,
        include: {
          remitente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              rol: true
            }
          },
          canal: {
            select: {
              id: true,
              nombre: true,
              categoria: true
            }
          },
          sucursal: {
            select: {
              id: true,
              nombre: true
            }
          }
        },
        orderBy: {
          fechaEnvio: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.mensaje.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: mensajes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Error al obtener mensajes:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear mensaje
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const body = await request.json()

    // Validar datos
    const validatedData = mensajeSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para enviar mensajes' },
        { status: 403 }
      )
    }

    // Si se proporciona canalId, usar el nuevo sistema
    if (validatedData.canalId) {
      // Verificar que el canal existe y está activo
      const canal = await prisma.canal.findUnique({
        where: { id: validatedData.canalId }
      })

      if (!canal || !canal.activo) {
        return NextResponse.json(
          { success: false, error: 'Canal no encontrado o inactivo' },
          { status: 404 }
        )
      }

      // Verificar permisos de escritura
      if (user.rol !== 'SUPER_ADMIN') {
        const permiso = await prisma.canalPermiso.findUnique({
          where: {
            canalId_rol: {
              canalId: validatedData.canalId,
              rol: user.rol
            }
          }
        })

        if (!permiso || !permiso.puedeEscribir) {
          // Verificar si es canal general o de su sucursal
          if (canal.categoria !== 'GENERAL' && 
              (canal.categoria !== 'SUCURSAL' || !user.sucursales.some(s => s.id === canal.sucursalId))) {
            return NextResponse.json(
              { success: false, error: 'Sin permisos para escribir en este canal' },
              { status: 403 }
            )
          }
        }
      }

      // Crear mensaje con canalId
      const mensaje = await prisma.mensaje.create({
        data: {
          contenido: validatedData.contenido || (validatedData.archivoUrl ? `Archivo: ${validatedData.nombreArchivo || 'archivo'}` : ''),
          canalId: validatedData.canalId,
          tipo: 'GENERAL', // Default para compatibilidad
          archivoUrl: validatedData.archivoUrl,
          tipoArchivo: validatedData.tipoArchivo,
          nombreArchivo: validatedData.nombreArchivo,
          remitenteId: user.id
        },
        include: {
          remitente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              rol: true
            }
          },
          canal: {
            select: {
              id: true,
              nombre: true,
              categoria: true
            }
          }
        }
      })

      // Registrar auditoría
      await registrarAuditoria({
        usuarioId: user.id,
        accion: 'ENVIAR_MENSAJE',
        tabla: 'mensajes',
        registroId: mensaje.id,
        datosNuevos: sanitizeDataForAudit(mensaje),
        ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        dispositivo: 'web'
      })

      return NextResponse.json({
        success: true,
        data: mensaje,
        message: 'Mensaje enviado exitosamente'
      })
    }

    // Sistema legacy (tipo/sucursalId/destinatarioId)
    // Validaciones específicas por tipo de mensaje
    if (validatedData.tipo === 'SUCURSAL') {
      if (!validatedData.sucursalId) {
        return NextResponse.json(
          { success: false, error: 'Sucursal es requerida para mensajes de sucursal' },
          { status: 400 }
        )
      }

      // Verificar acceso a la sucursal
      if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === validatedData.sucursalId)) {
        return NextResponse.json(
          { success: false, error: 'Sin acceso a esta sucursal' },
          { status: 403 }
        )
      }
    }

    if (validatedData.tipo === 'PRIVADO') {
      if (!validatedData.destinatarioId) {
        return NextResponse.json(
          { success: false, error: 'Destinatario es requerido para mensajes privados' },
          { status: 400 }
        )
      }

      // Verificar que el destinatario existe
      const destinatario = await prisma.usuario.findUnique({
        where: { id: validatedData.destinatarioId }
      })

      if (!destinatario) {
        return NextResponse.json(
          { success: false, error: 'Destinatario no encontrado' },
          { status: 404 }
        )
      }
    }

    // Crear mensaje legacy (necesita un canalId, usar canal general por defecto)
    const canalGeneral = await prisma.canal.findFirst({
      where: {
        categoria: 'GENERAL',
        nombre: { equals: 'general', mode: 'insensitive' },
        activo: true
      }
    })

    if (!canalGeneral) {
      return NextResponse.json(
        { success: false, error: 'Canal general no encontrado. Por favor, crea un canal primero.' },
        { status: 404 }
      )
    }

    const mensaje = await prisma.mensaje.create({
      data: {
        contenido: validatedData.contenido,
        canalId: canalGeneral.id,
        tipo: validatedData.tipo || 'GENERAL',
        sucursalId: validatedData.sucursalId,
        destinatarioId: validatedData.destinatarioId,
        archivoUrl: validatedData.archivoUrl,
        tipoArchivo: validatedData.tipoArchivo,
        nombreArchivo: validatedData.nombreArchivo,
        remitenteId: user.id
      },
      include: {
        remitente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            rol: true
          }
        },
        canal: {
          select: {
            id: true,
            nombre: true,
            categoria: true
          }
        },
        sucursal: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: 'ENVIAR_MENSAJE',
      tabla: 'mensajes',
      registroId: mensaje.id,
      datosNuevos: sanitizeDataForAudit(mensaje),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: mensaje,
      message: 'Mensaje enviado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al crear mensaje:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
