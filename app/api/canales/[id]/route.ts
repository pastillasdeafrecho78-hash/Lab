import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const updateCanalSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo').optional(),
  descripcion: z.string().max(500, 'Descripción muy larga').optional().nullable(),
  orden: z.number().int().optional(),
  activo: z.boolean().optional()
})

// GET - Obtener canal por ID
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

    const canal = await prisma.canal.findUnique({
      where: { id },
      include: {
        creadoPor: {
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
        },
        equipo: {
          select: {
            id: true,
            nombre: true
          }
        },
        permisos: true,
        _count: {
          select: {
            mensajes: true
          }
        }
      }
    })

    if (!canal) {
      return NextResponse.json(
        { success: false, error: 'Canal no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (user.rol !== 'SUPER_ADMIN') {
      const permiso = await prisma.canalPermiso.findUnique({
        where: {
          canalId_rol: {
            canalId: id,
            rol: user.rol
          }
        }
      })

      if (!permiso || !permiso.puedeVer) {
        // Verificar si es canal general o de su sucursal
        if (canal.categoria !== 'GENERAL' && 
            (canal.categoria !== 'SUCURSAL' || !user.sucursales.some(s => s.id === canal.sucursalId))) {
          return NextResponse.json(
            { success: false, error: 'Sin permisos para ver este canal' },
            { status: 403 }
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: canal
    })

  } catch (error: any) {
    console.error('Error al obtener canal:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar canal
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

    const validatedData = updateCanalSchema.parse(body)

    // Verificar que el canal existe
    const canalActual = await prisma.canal.findUnique({
      where: { id }
    })

    if (!canalActual) {
      return NextResponse.json(
        { success: false, error: 'Canal no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos de administración
    if (user.rol !== 'SUPER_ADMIN') {
      const permiso = await prisma.canalPermiso.findUnique({
        where: {
          canalId_rol: {
            canalId: id,
            rol: user.rol
          }
        }
      })

      if (!permiso || !permiso.puedeAdministrar) {
        return NextResponse.json(
          { success: false, error: 'Sin permisos para editar este canal' },
          { status: 403 }
        )
      }
    }

    // Actualizar canal
    const updateData: any = {}
    if (validatedData.nombre !== undefined) updateData.nombre = validatedData.nombre
    if (validatedData.descripcion !== undefined) updateData.descripcion = validatedData.descripcion
    if (validatedData.orden !== undefined) updateData.orden = validatedData.orden
    if (validatedData.activo !== undefined) updateData.activo = validatedData.activo

    const canal = await prisma.canal.update({
      where: { id },
      data: updateData,
      include: {
        creadoPor: {
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
        },
        equipo: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('UPDATE', 'canal'),
      tabla: 'canales',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(canalActual),
      datosNuevos: sanitizeDataForAudit(canal),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: canal,
      message: 'Canal actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al actualizar canal:', error)
    
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

// DELETE - Eliminar canal (soft delete)
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

    // Verificar que el canal existe
    const canal = await prisma.canal.findUnique({
      where: { id }
    })

    if (!canal) {
      return NextResponse.json(
        { success: false, error: 'Canal no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos de administración
    if (user.rol !== 'SUPER_ADMIN') {
      const permiso = await prisma.canalPermiso.findUnique({
        where: {
          canalId_rol: {
            canalId: id,
            rol: user.rol
          }
        }
      })

      if (!permiso || !permiso.puedeAdministrar) {
        return NextResponse.json(
          { success: false, error: 'Sin permisos para eliminar este canal' },
          { status: 403 }
        )
      }
    }

    // No permitir eliminar canal GENERAL
    if (canal.categoria === 'GENERAL' && canal.nombre.toLowerCase() === 'general') {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar el canal general' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.canal.update({
      where: { id },
      data: { activo: false }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('DELETE', 'canal'),
      tabla: 'canales',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(canal),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      message: 'Canal eliminado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al eliminar canal:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

