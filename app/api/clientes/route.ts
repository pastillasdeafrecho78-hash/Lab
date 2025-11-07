import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const clienteSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().min(1, 'Apellido es requerido'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  genero: z.string().optional(),
  direccion: z.string().optional()
})

// GET - Obtener clientes
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {
      activo: true
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: {
          comandas: {
            select: {
              id: true,
              numeroComanda: true,
              estado: true,
              fechaCreacion: true
            },
            orderBy: {
              fechaCreacion: 'desc'
            },
            take: 5
          }
        },
        orderBy: {
          nombre: 'asc'
        },
        skip,
        take: limit
      }),
      prisma.cliente.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: clientes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Error al obtener clientes:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear cliente
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const body = await request.json()

    // Validar datos
    const validatedData = clienteSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'RECEPCION'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear clientes' },
        { status: 403 }
      )
    }

    // Verificar si el email ya existe
    const clienteExistente = await prisma.cliente.findUnique({
      where: { email: validatedData.email }
    })

    if (clienteExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un cliente con este email' },
        { status: 400 }
      )
    }

    // Crear cliente
    const cliente = await prisma.cliente.create({
      data: {
        nombre: validatedData.nombre,
        apellido: validatedData.apellido,
        email: validatedData.email,
        telefono: validatedData.telefono,
        fechaNacimiento: validatedData.fechaNacimiento ? new Date(validatedData.fechaNacimiento) : null,
        genero: validatedData.genero,
        direccion: validatedData.direccion
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('CREATE', 'cliente'),
      tabla: 'clientes',
      registroId: cliente.id,
      datosNuevos: sanitizeDataForAudit(cliente),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: cliente,
      message: 'Cliente creado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al crear cliente:', error)
    
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
