import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const resultadoSchema = z.object({
  comandaId: z.string().min(1, 'Comanda es requerida'),
  elemento: z.string().min(1, 'Elemento es requerido'),
  valor: z.number().positive('Valor debe ser positivo'),
  unidad: z.string().min(1, 'Unidad es requerida'),
  rangoNormal: z.string().min(1, 'Rango normal es requerido'),
  observaciones: z.string().optional()
})

// GET - Obtener resultados
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { searchParams } = new URL(request.url)
    const comandaId = searchParams.get('comandaId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const skip = (page - 1) * limit

    const where: any = {}

    if (comandaId) {
      where.comandaId = comandaId
    }

    const [resultados, total] = await Promise.all([
      prisma.resultado.findMany({
        where,
        include: {
          comanda: {
            include: {
              cliente: {
                select: {
                  id: true,
                  nombre: true,
                  apellido: true
                }
              },
              sucursal: {
                select: {
                  id: true,
                  nombre: true
                }
              }
            }
          },
          registradoPor: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          }
        },
        orderBy: {
          fechaRegistro: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.resultado.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: resultados,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Error al obtener resultados:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear resultado
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const body = await request.json()

    // Validar datos
    const validatedData = resultadoSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para registrar resultados' },
        { status: 403 }
      )
    }

    // Verificar que la comanda existe y está en proceso
    const comanda = await prisma.comanda.findUnique({
      where: { id: validatedData.comandaId },
      include: {
        sucursal: true,
        tipoPrueba: true
      }
    })

    if (!comanda) {
      return NextResponse.json(
        { success: false, error: 'Comanda no encontrada' },
        { status: 404 }
      )
    }

    if (comanda.estado !== 'EN_PROCESO') {
      return NextResponse.json(
        { success: false, error: 'La comanda debe estar en proceso para registrar resultados' },
        { status: 400 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta comanda' },
        { status: 403 }
      )
    }

    // Verificar que el elemento está en la lista de elementos de la comanda
    if (!comanda.elementos.includes(validatedData.elemento)) {
      return NextResponse.json(
        { success: false, error: 'El elemento no está incluido en esta comanda' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un resultado para este elemento en esta comanda
    const resultadoExistente = await prisma.resultado.findFirst({
      where: {
        comandaId: validatedData.comandaId,
        elemento: validatedData.elemento
      }
    })

    if (resultadoExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un resultado para este elemento en esta comanda' },
        { status: 400 }
      )
    }

    // Crear resultado
    const resultado = await prisma.resultado.create({
      data: {
        comandaId: validatedData.comandaId,
        elemento: validatedData.elemento,
        valor: validatedData.valor,
        unidad: validatedData.unidad,
        rangoNormal: validatedData.rangoNormal,
        observaciones: validatedData.observaciones,
        registradoPorId: user.id
      },
      include: {
        comanda: {
          include: {
            cliente: {
              select: {
                id: true,
                nombre: true,
                apellido: true
              }
            },
            sucursal: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        registradoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    })

    // Verificar si todos los elementos de la comanda tienen resultados
    const resultadosComanda = await prisma.resultado.findMany({
      where: { comandaId: validatedData.comandaId }
    })

    const elementosCompletados = resultadosComanda.map(r => r.elemento)
    const todosCompletados = comanda.elementos.every(elemento => 
      elementosCompletados.includes(elemento)
    )

    // Si todos los elementos están completados, marcar comanda como completada
    if (todosCompletados) {
      await prisma.comanda.update({
        where: { id: validatedData.comandaId },
        data: {
          estado: 'COMPLETADA',
          fechaCompletado: new Date()
        }
      })
    }

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: 'REGISTRAR_RESULTADO',
      tabla: 'resultados',
      registroId: resultado.id,
      datosNuevos: sanitizeDataForAudit(resultado),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Resultado registrado exitosamente',
      comandaCompletada: todosCompletados
    })

  } catch (error: any) {
    console.error('Error al crear resultado:', error)
    
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
