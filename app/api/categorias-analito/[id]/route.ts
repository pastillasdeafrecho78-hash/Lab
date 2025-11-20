import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const categoriaUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').optional(),
  descripcion: z.string().optional(),
  analitoIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un parámetro').optional()
})

// GET - Obtener categoría por ID
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

    if (!user.permisos?.includes('catalogo.categorias.ver')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para consultar categorías' },
        { status: 403 }
      )
    }

    const categoria = await prisma.categoriaAnalito.findUnique({
      where: { id },
      include: {
        analitos: {
          include: {
            analito: true
          },
          orderBy: {
            orden: 'asc'
          }
        }
      }
    })

    if (!categoria) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categoria
    })
  } catch (error: any) {
    console.error('Error al obtener categoría:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar categoría
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

    if (!user.permisos?.includes('catalogo.categorias.editar')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para editar categorías' },
        { status: 403 }
      )
    }

    const validatedData = categoriaUpdateSchema.parse(body)

    // Obtener categoría actual para auditoría
    const categoriaActual = await prisma.categoriaAnalito.findUnique({
      where: { id },
      include: {
        analitos: {
          include: {
            analito: true
          }
        }
      }
    })

    if (!categoriaActual) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    // Si se proporcionan analitoIds, validar que existan
    if (validatedData.analitoIds) {
      const analitos = await prisma.analito.findMany({
        where: {
          id: {
            in: validatedData.analitoIds
          },
          activo: true
        }
      })

      if (analitos.length !== validatedData.analitoIds.length) {
        return NextResponse.json(
          { success: false, error: 'Alguno de los parámetros seleccionados no existe' },
          { status: 400 }
        )
      }

      // Eliminar relaciones existentes
      await prisma.categoriaAnalitoDetalle.deleteMany({
        where: { categoriaId: id }
      })

      // Crear nuevas relaciones
      await prisma.categoriaAnalitoDetalle.createMany({
        data: validatedData.analitoIds.map((analitoId, index) => ({
          categoriaId: id,
          analitoId,
          orden: index
        }))
      })
    }

    // Actualizar categoría
    const categoriaActualizada = await prisma.categoriaAnalito.update({
      where: { id },
      data: {
        nombre: validatedData.nombre?.trim(),
        descripcion: validatedData.descripcion?.trim()
      },
      include: {
        analitos: {
          include: {
            analito: true
          },
          orderBy: {
            orden: 'asc'
          }
        }
      }
    })

    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('UPDATE', 'categoria_analito'),
      tabla: 'categorias_analito',
      registroId: categoriaActualizada.id,
      datosAnteriores: sanitizeDataForAudit(categoriaActual),
      datosNuevos: sanitizeDataForAudit(categoriaActualizada),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: categoriaActualizada,
      message: 'Categoría actualizada exitosamente'
    })
  } catch (error: any) {
    console.error('Error al actualizar categoría:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Ya existe una categoría con ese nombre' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar categoría
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

    if (!user.permisos?.includes('catalogo.categorias.eliminar')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para eliminar categorías' },
        { status: 403 }
      )
    }

    const categoria = await prisma.categoriaAnalito.findUnique({
      where: { id },
      include: {
        tipoPruebas: true
      }
    })

    if (!categoria) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar categoría (las relaciones se eliminan en cascada por onDelete: Cascade)
    // Nota: Las categorías son solo para selección ágil de analitos, no bloquean eliminación
    await prisma.categoriaAnalito.delete({
      where: { id }
    })

    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('DELETE', 'categoria_analito'),
      tabla: 'categorias_analito',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(categoria),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    })
  } catch (error: any) {
    console.error('Error al eliminar categoría:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

