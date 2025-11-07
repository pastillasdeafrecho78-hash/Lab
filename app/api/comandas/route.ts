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
  tipoPruebaId: z.string().min(1, 'Tipo de prueba es requerido'),
  elementos: z.array(z.string()).min(1, 'Al menos un elemento es requerido'),
  observaciones: z.string().optional(),
  asignacionAutomatica: z.boolean().optional() // Si es true, ignora sucursalId y asigna automáticamente
})

// GET - Obtener comandas
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const estado = searchParams.get('estado')
    const sucursalId = searchParams.get('sucursalId')

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}
    
    if (estado) {
      where.estado = estado
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

    const [comandas, total] = await Promise.all([
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
      prisma.comanda.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: comandas,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Error al obtener comandas:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
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
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'RECEPCION'].includes(user.rol)) {
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
        : user.sucursales.map(s => s.id)
      
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
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === sucursalIdFinal)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a la sucursal asignada' },
        { status: 403 }
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
        tipoPruebaId: validatedData.tipoPruebaId,
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
