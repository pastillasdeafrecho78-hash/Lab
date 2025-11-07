import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const maquinariaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  modelo: z.string().optional(),
  marca: z.string().optional(),
  serie: z.string().optional(),
  sucursalId: z.string().min(1, 'Sucursal es requerida')
})

// GET - Obtener maquinaria
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { searchParams } = new URL(request.url)
    const sucursalId = searchParams.get('sucursalId')

    const where: any = {
      activa: true
    }

    if (sucursalId) {
      where.sucursalId = sucursalId
    }

    // Filtrar por sucursales del usuario si no es super admin
    if (user.rol !== 'SUPER_ADMIN') {
      where.sucursalId = {
        in: user.sucursales.map(s => s.id)
      }
    }

    const maquinaria = await prisma.maquinaria.findMany({
      where,
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true
          }
        },
        pruebas: {
          include: {
            tipoPrueba: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        _count: {
          select: {
            pruebas: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: maquinaria
    })

  } catch (error: any) {
    console.error('Error al obtener maquinaria:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear maquinaria
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const body = await request.json()

    // Validar datos
    const validatedData = maquinariaSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear maquinaria' },
        { status: 403 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === validatedData.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta sucursal' },
        { status: 403 }
      )
    }

    // Crear maquinaria
    const maquinaria = await prisma.maquinaria.create({
      data: {
        nombre: validatedData.nombre,
        modelo: validatedData.modelo,
        marca: validatedData.marca,
        serie: validatedData.serie,
        sucursalId: validatedData.sucursalId
      },
      include: {
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
      accion: getAccionAuditoria('CREATE', 'maquinaria'),
      tabla: 'maquinaria',
      registroId: maquinaria.id,
      datosNuevos: sanitizeDataForAudit(maquinaria),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: maquinaria,
      message: 'Maquinaria creada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al crear maquinaria:', error)
    
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
