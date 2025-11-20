import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const sucursalSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  direccion: z.string().min(1, 'Dirección es requerida'),
  telefono: z.string().min(1, 'Teléfono es requerido'),
  email: z.string().email('Email inválido').optional()
})

// GET - Obtener sucursales
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)

    const sucursales = await prisma.sucursal.findMany({
      where: {
        activa: true
      },
      include: {
        usuarios: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                rol: true
              }
            }
          }
        },
        maquinaria: {
          where: {
            activa: true
          }
        },
        _count: {
          select: {
            comandas: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    // Filtrar por sucursales del usuario si no es super admin
    const sucursalesFiltradas = user.rol === 'SUPER_ADMIN' 
      ? sucursales 
      : sucursales.filter(s => user.sucursales.some(us => us.id === s.id))

    return NextResponse.json({
      success: true,
      data: sucursalesFiltradas
    })

  } catch (error: any) {
    console.error('Error al obtener sucursales:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear sucursal
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const body = await request.json()

    // Validar datos
    const validatedData = sucursalSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear sucursales' },
        { status: 403 }
      )
    }

    // Crear sucursal
    const sucursal = await prisma.sucursal.create({
      data: {
        nombre: validatedData.nombre,
        direccion: validatedData.direccion,
        telefono: validatedData.telefono,
        email: validatedData.email
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('CREATE', 'sucursal'),
      tabla: 'sucursales',
      registroId: sucursal.id,
      datosNuevos: sanitizeDataForAudit(sucursal),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: sucursal,
      message: 'Sucursal creada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al crear sucursal:', error)
    
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
