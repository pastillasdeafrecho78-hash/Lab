import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'
import { ELEMENTOS_PRUEBA } from '@/types'

const tipoPruebaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  elementos: z.array(z.string()).min(1, 'Al menos un elemento es requerido')
})

// GET - Obtener tipos de prueba
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    await getUserFromToken(token)

    const tiposPrueba = await prisma.tipoPrueba.findMany({
      where: {
        activo: true
      },
      include: {
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

    return NextResponse.json({
      success: true,
      data: tiposPrueba
    })

  } catch (error: any) {
    console.error('Error al obtener tipos de prueba:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear tipo de prueba
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const body = await request.json()

    // Validar datos
    const validatedData = tipoPruebaSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear tipos de prueba' },
        { status: 403 }
      )
    }

    // Crear tipo de prueba
    const tipoPrueba = await prisma.tipoPrueba.create({
      data: {
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        elementos: validatedData.elementos
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('CREATE', 'tipo_prueba'),
      tabla: 'tipos_prueba',
      registroId: tipoPrueba.id,
      datosNuevos: sanitizeDataForAudit(tipoPrueba),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: tipoPrueba,
      message: 'Tipo de prueba creado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al crear tipo de prueba:', error)
    
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

// GET - Obtener elementos disponibles
export async function GET_ELEMENTOS(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    await getUserFromToken(token)

    return NextResponse.json({
      success: true,
      data: ELEMENTOS_PRUEBA
    })

  } catch (error: any) {
    console.error('Error al obtener elementos:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
