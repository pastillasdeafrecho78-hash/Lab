import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { notificarComandaActualizada } from '@/lib/notifications'
import { z } from 'zod'

const updateComandaSchema = z.object({
  estado: z.enum(['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'ENTREGADA', 'CANCELADA']).optional(),
  asignadoAId: z.string().optional(),
  observaciones: z.string().optional()
})

// GET - Obtener comanda por ID
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

    const comanda = await prisma.comanda.findUnique({
      where: { id },
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
          },
          orderBy: {
            fechaRegistro: 'asc'
          }
        }
      }
    })

    if (!comanda) {
      return NextResponse.json(
        { success: false, error: 'Comanda no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta comanda' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: comanda
    })

  } catch (error: any) {
    console.error('Error al obtener comanda:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar comanda
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
    const validatedData = updateComandaSchema.parse(body)

    // Obtener comanda actual
    const comandaActual = await prisma.comanda.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        tipoPrueba: true
      }
    })

    if (!comandaActual) {
      return NextResponse.json(
        { success: false, error: 'Comanda no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === comandaActual.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta comanda' },
        { status: 403 }
      )
    }

    // Verificar permisos según el estado
    if (validatedData.estado) {
      const estadoActual = comandaActual.estado
      const nuevoEstado = validatedData.estado

      // Validar transiciones de estado
      const transicionesValidas: Record<string, string[]> = {
        'PENDIENTE': ['EN_PROCESO', 'CANCELADA'],
        'EN_PROCESO': ['COMPLETADA', 'CANCELADA'],
        'COMPLETADA': ['ENTREGADA'],
        'ENTREGADA': [],
        'CANCELADA': []
      }

      if (!transicionesValidas[estadoActual]?.includes(nuevoEstado)) {
        return NextResponse.json(
          { success: false, error: `No se puede cambiar de ${estadoActual} a ${nuevoEstado}` },
          { status: 400 }
        )
      }

      // Verificar permisos por rol
      if (nuevoEstado === 'EN_PROCESO' && !['TECNICO_LABORATORIO', 'RESPONSABLE_SUCURSAL', 'RESPONSABLE_SANITARIO', 'SUPER_ADMIN'].includes(user.rol)) {
        return NextResponse.json(
          { success: false, error: 'Sin permisos para asignar comanda' },
          { status: 403 }
        )
      }

      if (nuevoEstado === 'COMPLETADA' && !['TECNICO_LABORATORIO', 'RESPONSABLE_SUCURSAL', 'RESPONSABLE_SANITARIO', 'SUPER_ADMIN'].includes(user.rol)) {
        return NextResponse.json(
          { success: false, error: 'Sin permisos para completar comanda' },
          { status: 403 }
        )
      }
    }

    // Preparar datos de actualización
    const updateData: any = { ...validatedData }

    // Actualizar fechas según el estado
    if (validatedData.estado === 'EN_PROCESO' && comandaActual.estado === 'PENDIENTE') {
      updateData.fechaAsignacion = new Date()
      if (validatedData.asignadoAId) {
        updateData.asignadoAId = validatedData.asignadoAId
      }
    }

    if (validatedData.estado === 'COMPLETADA' && comandaActual.estado === 'EN_PROCESO') {
      updateData.fechaCompletado = new Date()
    }

    if (validatedData.estado === 'ENTREGADA' && comandaActual.estado === 'COMPLETADA') {
      updateData.fechaEntrega = new Date()
    }

    // Actualizar comanda
    const comandaActualizada = await prisma.comanda.update({
      where: { id },
      data: updateData,
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
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('UPDATE', 'comanda'),
      tabla: 'comandas',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(comandaActual),
      datosNuevos: sanitizeDataForAudit(comandaActualizada),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    // Notificar cambio de estado si hubo
    if (validatedData.estado && comandaActual.estado !== validatedData.estado) {
      await notificarComandaActualizada(
        id,
        comandaActualizada.sucursalId,
        comandaActual.estado,
        validatedData.estado,
        `${comandaActualizada.cliente.nombre} ${comandaActualizada.cliente.apellido}`
      )
    }

    return NextResponse.json({
      success: true,
      data: comandaActualizada,
      message: 'Comanda actualizada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al actualizar comanda:', error)
    
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

// DELETE - Eliminar comanda
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
        { success: false, error: 'Sin permisos para eliminar comandas' },
        { status: 403 }
      )
    }

    // Obtener comanda
    const comanda = await prisma.comanda.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        tipoPrueba: true,
        resultados: true
      }
    })

    if (!comanda) {
      return NextResponse.json(
        { success: false, error: 'Comanda no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta comanda' },
        { status: 403 }
      )
    }

    // No permitir eliminar comandas con resultados
    if (comanda.resultados.length > 0) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar una comanda con resultados registrados' },
        { status: 400 }
      )
    }

    // Eliminar comanda
    await prisma.comanda.delete({
      where: { id }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('DELETE', 'comanda'),
      tabla: 'comandas',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(comanda),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      message: 'Comanda eliminada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al eliminar comanda:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
