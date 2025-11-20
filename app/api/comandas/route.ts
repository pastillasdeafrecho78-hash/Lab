import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { asignarSucursalAutomatica } from '@/lib/sucursal-asignacion'
import { notificarComandaCreada } from '@/lib/notifications'
import { z } from 'zod'

const comandaSchema = z.object({
  clienteId: z.string().min(1, 'Cliente es requerido'),
  sucursalId: z.string().min(1, 'Sucursal es requerida').optional(),
  tipoPruebaId: z.string().min(1, 'Tipo de prueba es requerido').optional(),
  categoriaId: z.string().min(1, 'Categoría es requerida').optional(), // Nueva: ID de categoría
  elementos: z.array(z.string()).min(1, 'Al menos un elemento es requerido'),
  observaciones: z.string().optional(),
  asignacionAutomatica: z.boolean().optional() // Si es true, ignora sucursalId y asigna automáticamente
}).refine(
  (data) => data.tipoPruebaId || data.categoriaId,
  {
    message: 'Debe proporcionar tipoPruebaId o categoriaId',
    path: ['tipoPruebaId']
  }
)

// GET - Obtener comandas
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 401 }
      )
    }

    if (!user.permisos?.includes('comandas.ver')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para consultar comandas' },
        { status: 403 }
      )
    }
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const estado = searchParams.get('estado')
    const sucursalId = searchParams.get('sucursalId')

    const skip = (page - 1) * limit

    // Archivar automáticamente comandas finalizadas con más de 24 horas
    const hace24Horas = new Date()
    hace24Horas.setHours(hace24Horas.getHours() - 24)
    
    await prisma.comanda.updateMany({
      where: {
        estado: 'COMPLETADA',
        archivada: false,
        fechaCompletado: {
          lte: hace24Horas
        }
      },
      data: {
        archivada: true,
        fechaArchivado: new Date()
      }
    })

    // Construir filtros
    const where: any = { 
      archivada: { not: true }
    }
    const whereArchivadas: any = { archivada: true }
    
    if (estado) {
      where.estado = estado
      whereArchivadas.estado = estado
    }

    // Filtrar por sucursales del usuario si no es super admin
    if (user.rol !== 'SUPER_ADMIN' && user.sucursales && Array.isArray(user.sucursales)) {
      const sucursalesIds = user.sucursales.map(s => s.id)
      where.sucursalId = { in: sucursalesIds }
      whereArchivadas.sucursalId = { in: sucursalesIds }
    } else if (sucursalId) {
      // Solo aplicar filtro de sucursal si es super admin y se especificó
      where.sucursalId = sucursalId
      whereArchivadas.sucursalId = sucursalId
    }

    const [comandas, total, comandasArchivadas, totalArchivadas] = await Promise.all([
      prisma.comanda.findMany({
        where,
        include: {
          cliente: true,
          sucursal: true,
          tipoPrueba: true,
          creadoPor: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          },
          asignadoA: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          },
          resultados: {
            include: {
              registradoPor: {
                select: {
                  id: true,
                  nombre: true,
                  apellido: true
                }
              }
            }
          }
        },
        orderBy: {
          fechaCreacion: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.comanda.count({ where }),
      prisma.comanda.findMany({
        where: whereArchivadas,
        include: {
          cliente: true,
          sucursal: true,
          tipoPrueba: true,
          creadoPor: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          },
          asignadoA: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          },
          resultados: {
            include: {
              registradoPor: {
                select: {
                  id: true,
                  nombre: true,
                  apellido: true
                }
              }
            }
          }
        },
        orderBy: {
          fechaArchivado: 'desc'
        },
        take: 50 // Limitar archivadas a 50 más recientes
      }),
      prisma.comanda.count({ where: whereArchivadas })
    ])

    return NextResponse.json({
      success: true,
      data: comandas,
      archivadas: comandasArchivadas,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      archivadasPagination: {
        total: totalArchivadas,
        shown: comandasArchivadas.length
      }
    })

  } catch (error: any) {
    console.error('Error al obtener comandas:', error)
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : undefined
      },
      { status: 500 }
    )
  }
}

// POST - Crear comanda
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const body = await request.json()

    // Validar datos
    const validatedData = comandaSchema.parse(body)

    // Verificar permisos
    if (!user.permisos?.includes('comandas.crear')) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear comandas' },
        { status: 403 }
      )
    }

    // Determinar sucursal a asignar
    let sucursalIdFinal = validatedData.sucursalId

    // Si se solicita asignación automática o no se proporcionó sucursal
    if (validatedData.asignacionAutomatica || !sucursalIdFinal) {
      const sucursalesDisponibles = user.rol === 'SUPER_ADMIN' 
        ? undefined 
        : (user.sucursales && Array.isArray(user.sucursales) ? user.sucursales.map(s => s.id) : [])
      
      const sucursalAsignada = await asignarSucursalAutomatica(
        validatedData.clienteId,
        sucursalesDisponibles
      )

      if (!sucursalAsignada) {
        return NextResponse.json(
          { success: false, error: 'No se pudo asignar una sucursal automáticamente. Por favor selecciona una sucursal.' },
          { status: 400 }
        )
      }

      sucursalIdFinal = sucursalAsignada
    }

    // Verificar acceso a la sucursal asignada
    if (user.rol !== 'SUPER_ADMIN' && user.sucursales && Array.isArray(user.sucursales) && !user.sucursales.some(s => s.id === sucursalIdFinal)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a la sucursal asignada' },
        { status: 403 }
      )
    }

    // Determinar tipoPruebaId: si se proporciona categoriaId, buscar o crear TipoPrueba
    let tipoPruebaIdFinal = validatedData.tipoPruebaId

    if (validatedData.categoriaId && !tipoPruebaIdFinal) {
      // Buscar categoría
      const categoria = await prisma.categoriaAnalito.findUnique({
        where: { id: validatedData.categoriaId },
        include: {
          analitos: {
            include: { analito: true },
            orderBy: { orden: 'asc' }
          },
          tipoPruebas: {
            include: { tipoPrueba: true }
          }
        }
      })

      if (!categoria) {
        return NextResponse.json(
          { success: false, error: 'Categoría no encontrada' },
          { status: 404 }
        )
      }

      // Buscar si ya existe un TipoPrueba que use esta categoría
      const tipoPruebaExistente = categoria.tipoPruebas.find(tp => tp.tipoPrueba.activo)?.tipoPrueba

      if (tipoPruebaExistente) {
        tipoPruebaIdFinal = tipoPruebaExistente.id
      } else {
        // Crear nuevo TipoPrueba basado en la categoría
        const elementos = categoria.analitos.map(d => d.analito.nombre)
        
        const nuevoTipoPrueba = await prisma.tipoPrueba.create({
          data: {
            nombre: categoria.nombre,
            descripcion: categoria.descripcion || `Prueba basada en categoría ${categoria.nombre}`,
            elementos,
            categorias: {
              create: {
                categoriaId: categoria.id
              }
            },
            analitosAsignados: {
              create: categoria.analitos.map(d => ({
                analitoId: d.analito.id
              }))
            }
          }
        })

        tipoPruebaIdFinal = nuevoTipoPrueba.id
      }
    }

    if (!tipoPruebaIdFinal) {
      return NextResponse.json(
        { success: false, error: 'Tipo de prueba es requerido' },
        { status: 400 }
      )
    }

    // Generar número de comanda único
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    
    const count = await prisma.comanda.count({
      where: {
        fechaCreacion: {
          gte: new Date(year, today.getMonth(), today.getDate()),
          lt: new Date(year, today.getMonth(), today.getDate() + 1)
        }
      }
    })
    
    const numeroComanda = `CMD-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`

    // Crear comanda
    const comanda = await prisma.comanda.create({
      data: {
        numeroComanda,
        clienteId: validatedData.clienteId,
        sucursalId: sucursalIdFinal,
        tipoPruebaId: tipoPruebaIdFinal,
        elementos: validatedData.elementos,
        observaciones: validatedData.observaciones,
        creadoPorId: user.id
      },
      include: {
        cliente: true,
        sucursal: true,
        tipoPrueba: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('CREATE', 'comanda'),
      tabla: 'comandas',
      registroId: comanda.id,
      datosNuevos: sanitizeDataForAudit(comanda),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    // Notificar creación de comanda
    await notificarComandaCreada(
      comanda.id,
      comanda.sucursalId,
      `${comanda.cliente.nombre} ${comanda.cliente.apellido}`,
      comanda.cliente.email,
      comanda.numeroComanda
    )

    return NextResponse.json({
      success: true,
      data: comanda,
      message: 'Comanda creada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al crear comanda:', error)
    
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
