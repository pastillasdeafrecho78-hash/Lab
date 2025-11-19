import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const analitoUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').optional(),
  descripcion: z.string().optional(),
  unidad: z.string().optional(),
  activo: z.boolean().optional()
})

// GET - Obtener analito por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { id } = params

    if (!user.permisos?.includes('catalogo.analitos.ver')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para consultar parámetros' },
        { status: 403 }
      )
    }

    const analito = await prisma.analito.findUnique({
      where: { id }
    })

    if (!analito) {
      return NextResponse.json(
        { success: false, error: 'Parámetro no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: analito
    })
  } catch (error: any) {
    console.error('Error al obtener analito:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar analito
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { id } = params
    const body = await request.json()

    if (!user.permisos?.includes('catalogo.analitos.editar')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para editar parámetros' },
        { status: 403 }
      )
    }

    const validatedData = analitoUpdateSchema.parse(body)

    // Obtener analito actual para auditoría
    const analitoActual = await prisma.analito.findUnique({
      where: { id }
    })

    if (!analitoActual) {
      return NextResponse.json(
        { success: false, error: 'Parámetro no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar analito
    const analitoActualizado = await prisma.analito.update({
      where: { id },
      data: {
        nombre: validatedData.nombre?.trim(),
        descripcion: validatedData.descripcion?.trim(),
        unidad: validatedData.unidad?.trim(),
        activo: validatedData.activo !== undefined ? validatedData.activo : analitoActual.activo
      }
    })

    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('UPDATE', 'analito'),
      tabla: 'analitos',
      registroId: analitoActualizado.id,
      datosAnteriores: sanitizeDataForAudit(analitoActual),
      datosNuevos: sanitizeDataForAudit(analitoActualizado),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: analitoActualizado,
      message: 'Parámetro actualizado exitosamente'
    })
  } catch (error: any) {
    console.error('Error al actualizar analito:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    if (error.code === 'P2002') {
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

// DELETE - Eliminar/desactivar analito
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { id } = params

    if (!user.permisos?.includes('catalogo.analitos.eliminar')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para eliminar parámetros' },
        { status: 403 }
      )
    }

    const analito = await prisma.analito.findUnique({
      where: { id },
      include: {
        categorias: true,
        tipoPruebas: true
      }
    })

    if (!analito) {
      return NextResponse.json(
        { success: false, error: 'Parámetro no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si está siendo usado
    if (analito.categorias.length > 0 || analito.tipoPruebas.length > 0) {
      // Desactivar en lugar de eliminar
      const analitoDesactivado = await prisma.analito.update({
        where: { id },
        data: { activo: false }
      })

      await registrarAuditoria({
        usuarioId: user.id,
        accion: getAccionAuditoria('DELETE', 'analito'),
        tabla: 'analitos',
        registroId: analitoDesactivado.id,
        datosAnteriores: sanitizeDataForAudit(analito),
        datosNuevos: sanitizeDataForAudit(analitoDesactivado),
        ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        dispositivo: 'web'
      })

      return NextResponse.json({
        success: true,
        data: analitoDesactivado,
        message: 'Parámetro desactivado (está en uso)'
      })
    }

    // Eliminar si no está en uso
    await prisma.analito.delete({
      where: { id }
    })

    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('DELETE', 'analito'),
      tabla: 'analitos',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(analito),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      message: 'Parámetro eliminado exitosamente'
    })
  } catch (error: any) {
    console.error('Error al eliminar analito:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

