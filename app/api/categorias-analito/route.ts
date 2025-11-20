import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const categoriaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  analitoIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un parámetro')
})

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)

    if (!user.permisos?.includes('catalogo.categorias.ver')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para consultar categorías' },
        { status: 403 }
      )
    }

    const categorias = await prisma.categoriaAnalito.findMany({
      include: {
        analitos: {
          include: {
            analito: true
          },
          orderBy: {
            orden: 'asc'
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: categorias
    })
  } catch (error) {
    console.error('Error al obtener categorías de analitos:', error)
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

    if (!user.permisos?.includes('catalogo.categorias.crear')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear categorías' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = categoriaSchema.parse(body)

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

    const categoria = await prisma.categoriaAnalito.create({
      data: {
        nombre: validatedData.nombre.trim(),
        descripcion: validatedData.descripcion?.trim(),
        analitos: {
          create: validatedData.analitoIds.map((analitoId, index) => ({
            analitoId,
            orden: index
          }))
        }
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
      accion: getAccionAuditoria('CREATE', 'categoria_analito'),
      tabla: 'categorias_analito',
      registroId: categoria.id,
      datosNuevos: sanitizeDataForAudit(categoria),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: categoria,
      message: 'Categoría creada exitosamente'
    })
  } catch (error) {
    console.error('Error al crear categoría de analitos:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    if ((error as any)?.code === 'P2002') {
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




