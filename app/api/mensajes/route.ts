import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const mensajeSchema = z.object({
  contenido: z.string().min(1, 'Contenido es requerido'),
  tipo: z.enum(['SUCURSAL', 'GENERAL', 'PRIVADO']),
  sucursalId: z.string().optional(),
  destinatarioId: z.string().optional(),
  archivoUrl: z.string().url().optional(),
  tipoArchivo: z.string().optional(),
  nombreArchivo: z.string().optional()
})

// GET - Obtener mensajes
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const sucursalId = searchParams.get('sucursalId')
    const destinatarioId = searchParams.get('destinatarioId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}

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

    // Crear mensaje
    const mensaje = await prisma.mensaje.create({
      data: {
        contenido: validatedData.contenido,
        tipo: validatedData.tipo,
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
