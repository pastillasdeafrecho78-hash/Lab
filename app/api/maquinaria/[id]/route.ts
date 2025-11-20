import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const updateMaquinariaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').optional(),
  modelo: z.string().optional(),
  marca: z.string().optional(),
  serie: z.string().optional(),
  activa: z.boolean().optional()
})

// GET - Obtener maquinaria por ID
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

    const maquinaria = await prisma.maquinaria.findUnique({
      where: { id },
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true
          }
        },
        pruebas: {
          include: {
            tipoPrueba: {
              select: {
                id: true,
                nombre: true,
                analitosAsignados: {
                  include: {
                    analito: {
                      select: {
                        id: true,
                        nombre: true,
                        unidad: true,
                        descripcion: true
                      }
                    }
                  }
                },
                categorias: {
                  include: {
                    categoria: {
                      select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        analitos: {
                          include: {
                            analito: {
                              select: {
                                id: true,
                                nombre: true,
                                unidad: true,
                                descripcion: true
                              }
                            }
                          },
                          orderBy: {
                            orden: 'asc'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!maquinaria) {
      return NextResponse.json(
        { success: false, error: 'Maquinaria no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === maquinaria.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta maquinaria' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: maquinaria
    })

  } catch (error: any) {
    console.error('Error al obtener maquinaria:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar maquinaria
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
    const validatedData = updateMaquinariaSchema.parse(body)

    // Obtener maquinaria actual
    const maquinariaActual = await prisma.maquinaria.findUnique({
      where: { id },
      include: {
        sucursal: true
      }
    })

    if (!maquinariaActual) {
      return NextResponse.json(
        { success: false, error: 'Maquinaria no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === maquinariaActual.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta maquinaria' },
        { status: 403 }
      )
    }

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para editar maquinaria' },
        { status: 403 }
      )
    }

    // Actualizar maquinaria
    const maquinariaActualizada = await prisma.maquinaria.update({
      where: { id },
      data: validatedData,
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true
          }
        },
        pruebas: {
          include: {
            tipoPrueba: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('UPDATE', 'maquinaria'),
      tabla: 'maquinaria',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(maquinariaActual),
      datosNuevos: sanitizeDataForAudit(maquinariaActualizada),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: maquinariaActualizada,
      message: 'Maquinaria actualizada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al actualizar maquinaria:', error)
    
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

// DELETE - Eliminar maquinaria
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
        { success: false, error: 'Sin permisos para eliminar maquinaria' },
        { status: 403 }
      )
    }

    // Obtener maquinaria
    const maquinaria = await prisma.maquinaria.findUnique({
      where: { id },
      include: {
        sucursal: true,
        pruebas: true
      }
    })

    if (!maquinaria) {
      return NextResponse.json(
        { success: false, error: 'Maquinaria no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === maquinaria.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta maquinaria' },
        { status: 403 }
      )
    }

    // No permitir eliminar maquinaria con pruebas asignadas
    if (maquinaria.pruebas.length > 0) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar maquinaria con pruebas asignadas' },
        { status: 400 }
      )
    }

    // Eliminar maquinaria (soft delete)
    await prisma.maquinaria.update({
      where: { id },
      data: { activa: false }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('DELETE', 'maquinaria'),
      tabla: 'maquinaria',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(maquinaria),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      message: 'Maquinaria eliminada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al eliminar maquinaria:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
