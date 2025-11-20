import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const analitoSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  unidad: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)

    if (!user.permisos?.includes('catalogo.analitos.ver')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para consultar parámetros' },
        { status: 403 }
      )
    }

    const analitos = await prisma.analito.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: analitos
    })
  } catch (error) {
    console.error('Error al obtener analitos:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)

    if (!user.permisos?.includes('catalogo.analitos.crear')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear parámetros' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = analitoSchema.parse(body)

    const analito = await prisma.analito.create({
      data: {
        nombre: validatedData.nombre.trim(),
        descripcion: validatedData.descripcion?.trim(),
        unidad: validatedData.unidad?.trim()
      }
    })

    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('CREATE', 'analito'),
      tabla: 'analitos',
      registroId: analito.id,
      datosNuevos: sanitizeDataForAudit(analito),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: analito,
      message: 'Parámetro creado exitosamente'
    })
  } catch (error) {
    console.error('Error al crear analito:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Ya existe un parámetro con ese nombre' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}




