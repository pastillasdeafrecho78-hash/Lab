import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const tipoPruebaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  elementos: z.array(z.string()).optional(),
  analitoIds: z.array(z.string()).optional(),
  categoriaIds: z.array(z.string()).optional()
}).refine(
  (data) =>
    (data.elementos && data.elementos.length > 0) ||
    (data.analitoIds && data.analitoIds.length > 0) ||
    (data.categoriaIds && data.categoriaIds.length > 0),
  {
    message: 'Debe seleccionar al menos un parámetro o categoría',
    path: ['elementos']
  }
)

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
        },
        categorias: {
          include: {
            categoria: {
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
            }
          }
        },
        analitosAsignados: {
          include: {
            analito: true
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

    const validatedData = tipoPruebaSchema.parse(body)

    if (!user.permisos?.includes('catalogo.categorias.crear') && !user.permisos?.includes('maquinaria.editar')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear tipos de prueba' },
        { status: 403 }
      )
    }

    const analitoIds = validatedData.analitoIds ?? []
    const categoriaIds = validatedData.categoriaIds ?? []

    const analitos = analitoIds.length
      ? await prisma.analito.findMany({
          where: {
            id: {
              in: analitoIds
            },
            activo: true
          }
        })
      : []

    if (analitoIds.length && analitos.length !== analitoIds.length) {
      return NextResponse.json(
        { success: false, error: 'Alguno de los parámetros seleccionados no existe' },
        { status: 400 }
      )
    }

    const categorias = categoriaIds.length
      ? await prisma.categoriaAnalito.findMany({
          where: {
            id: {
              in: categoriaIds
            }
          },
          include: {
            analitos: {
              include: { analito: true },
              orderBy: { orden: 'asc' }
            }
          }
        })
      : []

    if (categoriaIds.length && categorias.length !== categoriaIds.length) {
      return NextResponse.json(
        { success: false, error: 'Alguna de las categorías seleccionadas no existe' },
        { status: 400 }
      )
    }

    const elementosDesdeCategorias = categorias.flatMap(categoria =>
      categoria.analitos.map(detalle => detalle.analito.nombre)
    )

    const elementosDesdeAnalitos = analitos.map(analito => analito.nombre)
    const elementosManual = validatedData.elementos ?? []

    const elementosTotales = Array.from(
      new Set([
        ...elementosManual,
        ...elementosDesdeAnalitos,
        ...elementosDesdeCategorias
      ])
    )

    const tipoPrueba = await prisma.tipoPrueba.create({
      data: {
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        elementos: elementosTotales,
        analitosAsignados: analitos.length
          ? {
              create: analitos.map(analito => ({
                analitoId: analito.id
              }))
            }
          : undefined,
        categorias: categorias.length
          ? {
              create: categorias.map(categoria => ({
                categoriaId: categoria.id
              }))
            }
          : undefined
      },
      include: {
        categorias: {
          include: {
            categoria: {
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
            }
          }
        },
        analitosAsignados: {
          include: {
            analito: true
          }
        }
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

  } catch (error: any) {
    console.error('Error al obtener elementos:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
