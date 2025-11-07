import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const updateResultadoSchema = z.object({
  valor: z.number().positive('Valor debe ser positivo').optional(),
  unidad: z.string().min(1, 'Unidad es requerida').optional(),
  rangoNormal: z.string().min(1, 'Rango normal es requerido').optional(),
  observaciones: z.string().optional()
})

// GET - Obtener resultado por ID
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

    const resultado = await prisma.resultado.findUnique({
      where: { id },
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

    if (!resultado) {
      return NextResponse.json(
        { success: false, error: 'Resultado no encontrado' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === resultado.comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a este resultado' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: resultado
    })

  } catch (error: any) {
    console.error('Error al obtener resultado:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar resultado
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

    // Validar datos
    const validatedData = updateResultadoSchema.parse(body)

    // Obtener resultado actual
    const resultadoActual = await prisma.resultado.findUnique({
      where: { id },
      include: {
        comanda: {
          include: {
            sucursal: true
          }
        }
      }
    })

    if (!resultadoActual) {
      return NextResponse.json(
        { success: false, error: 'Resultado no encontrado' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === resultadoActual.comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a este resultado' },
        { status: 403 }
      )
    }

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para editar resultados' },
        { status: 403 }
      )
    }

    // Verificar que la comanda no esté entregada
    if (resultadoActual.comanda.estado === 'ENTREGADA') {
      return NextResponse.json(
        { success: false, error: 'No se puede editar resultados de comandas entregadas' },
        { status: 400 }
      )
    }

    // Actualizar resultado
    const resultadoActualizado = await prisma.resultado.update({
      where: { id },
      data: validatedData,
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

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('UPDATE', 'resultado'),
      tabla: 'resultados',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(resultadoActual),
      datosNuevos: sanitizeDataForAudit(resultadoActualizado),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: resultadoActualizado,
      message: 'Resultado actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al actualizar resultado:', error)
    
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

// DELETE - Eliminar resultado
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

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para eliminar resultados' },
        { status: 403 }
      )
    }

    // Obtener resultado
    const resultado = await prisma.resultado.findUnique({
      where: { id },
      include: {
        comanda: {
          include: {
            sucursal: true
          }
        }
      }
    })

    if (!resultado) {
      return NextResponse.json(
        { success: false, error: 'Resultado no encontrado' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === resultado.comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a este resultado' },
        { status: 403 }
      )
    }

    // Verificar que la comanda no esté entregada
    if (resultado.comanda.estado === 'ENTREGADA') {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar resultados de comandas entregadas' },
        { status: 400 }
      )
    }

    // Eliminar resultado
    await prisma.resultado.delete({
      where: { id }
    })

    // Verificar si la comanda debe volver a estado EN_PROCESO
    const resultadosRestantes = await prisma.resultado.findMany({
      where: { comandaId: resultado.comandaId }
    })

    const elementosCompletados = resultadosRestantes.map(r => r.elemento)
    const todosCompletados = resultado.comanda.elementos.every(elemento => 
      elementosCompletados.includes(elemento)
    )

    if (!todosCompletados && resultado.comanda.estado === 'COMPLETADA') {
      await prisma.comanda.update({
        where: { id: resultado.comandaId },
        data: {
          estado: 'EN_PROCESO',
          fechaCompletado: null
        }
      })
    }

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('DELETE', 'resultado'),
      tabla: 'resultados',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(resultado),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      message: 'Resultado eliminado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al eliminar resultado:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
