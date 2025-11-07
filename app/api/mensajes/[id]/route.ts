import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'

// PUT - Marcar mensaje como leído
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

    // Obtener mensaje
    const mensaje = await prisma.mensaje.findUnique({
      where: { id },
      include: {
        remitente: true,
        sucursal: true
      }
    })

    if (!mensaje) {
      return NextResponse.json(
        { success: false, error: 'Mensaje no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos para leer el mensaje
    if (user.rol !== 'SUPER_ADMIN') {
      const userSucursales = user.sucursales.map(s => s.id)
      
      const canRead = 
        mensaje.tipo === 'GENERAL' ||
        (mensaje.tipo === 'SUCURSAL' && mensaje.sucursalId && userSucursales.includes(mensaje.sucursalId)) ||
        (mensaje.tipo === 'PRIVADO' && (mensaje.remitenteId === user.id || mensaje.destinatarioId === user.id))

      if (!canRead) {
        return NextResponse.json(
          { success: false, error: 'Sin permisos para leer este mensaje' },
          { status: 403 }
        )
      }
    }

    // Marcar como leído si el usuario es el destinatario
    if (mensaje.destinatarioId === user.id && !mensaje.leido) {
      await prisma.mensaje.update({
        where: { id },
        data: { leido: true }
      })

      // Registrar auditoría
      await registrarAuditoria({
        usuarioId: user.id,
        accion: 'LEER_MENSAJE',
        tabla: 'mensajes',
        registroId: id,
        datosAnteriores: sanitizeDataForAudit(mensaje),
        datosNuevos: { ...sanitizeDataForAudit(mensaje), leido: true },
        ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        dispositivo: 'web'
      })
    }

    return NextResponse.json({
      success: true,
      data: mensaje,
      message: 'Mensaje marcado como leído'
    })

  } catch (error: any) {
    console.error('Error al marcar mensaje como leído:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar mensaje
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

    // Obtener mensaje
    const mensaje = await prisma.mensaje.findUnique({
      where: { id },
      include: {
        remitente: true,
        sucursal: true
      }
    })

    if (!mensaje) {
      return NextResponse.json(
        { success: false, error: 'Mensaje no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos para eliminar
    const canDelete = 
      user.rol === 'SUPER_ADMIN' ||
      user.rol === 'RESPONSABLE_SANITARIO' ||
      mensaje.remitenteId === user.id

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para eliminar este mensaje' },
        { status: 403 }
      )
    }

    // Eliminar mensaje
    await prisma.mensaje.delete({
      where: { id }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: 'ELIMINAR_MENSAJE',
      tabla: 'mensajes',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(mensaje),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      message: 'Mensaje eliminado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al eliminar mensaje:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
