import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const usuarioUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').optional(),
  apellido: z.string().min(1, 'Apellido es requerido').optional(),
  telefono: z.string().optional(),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres').optional(),
  rol: z.enum(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION']).optional(),
  sucursales: z.array(z.string()).min(1, 'Al menos una sucursal es requerida').optional()
})

// GET - Obtener usuario por ID
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

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para ver usuarios' },
        { status: 403 }
      )
    }

    const { id } = params

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        sucursales: {
          include: {
            sucursal: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Filtrar según permisos
    if (user.rol !== 'SUPER_ADMIN') {
      const userSucursales = user.sucursales.map(s => s.id)
      const hasAccess = usuario.sucursales.some(us => 
        userSucursales.includes(us.sucursalId)
      )

      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Sin acceso a este usuario' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        telefono: usuario.telefono,
        rol: usuario.rol,
        activo: usuario.activo,
        ultimoAcceso: usuario.ultimoAcceso,
        sucursales: usuario.sucursales.map(us => ({
          id: us.sucursal.id,
          nombre: us.sucursal.nombre
        }))
      }
    })

  } catch (error: any) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar usuario
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
    const validatedData = usuarioUpdateSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para actualizar usuarios' },
        { status: 403 }
      )
    }

    // Obtener usuario actual para auditoría
    const usuarioActual = await prisma.usuario.findUnique({
      where: { id },
      include: {
        sucursales: {
          include: {
            sucursal: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    })

    if (!usuarioActual) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar acceso a las sucursales si se están actualizando
    if (validatedData.sucursales && user.rol !== 'SUPER_ADMIN') {
      const userSucursales = user.sucursales.map(s => s.id)
      const hasAccess = validatedData.sucursales.every(sucursalId => 
        userSucursales.includes(sucursalId)
      )

      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Sin acceso a una o más sucursales' },
          { status: 403 }
        )
      }
    }

    // Verificar que las sucursales existen
    if (validatedData.sucursales) {
      const sucursalesExistentes = await prisma.sucursal.findMany({
        where: {
          id: { in: validatedData.sucursales },
          activa: true
        }
      })

      if (sucursalesExistentes.length !== validatedData.sucursales.length) {
        return NextResponse.json(
          { success: false, error: 'Una o más sucursales no existen' },
          { status: 400 }
        )
      }
    }

    // Preparar datos de actualización
    const updateData: any = {}
    if (validatedData.nombre) updateData.nombre = validatedData.nombre
    if (validatedData.apellido) updateData.apellido = validatedData.apellido
    if (validatedData.telefono !== undefined) updateData.telefono = validatedData.telefono
    if (validatedData.rol) updateData.rol = validatedData.rol
    if (validatedData.password) {
      updateData.password = await hashPassword(validatedData.password)
    }

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: updateData,
      include: {
        sucursales: {
          include: {
            sucursal: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    })

    // Actualizar sucursales si se proporcionan
    if (validatedData.sucursales) {
      // Eliminar asignaciones existentes
      await prisma.usuarioSucursal.deleteMany({
        where: { usuarioId: id }
      })

      // Crear nuevas asignaciones
      if (validatedData.sucursales.length > 0) {
        await prisma.usuarioSucursal.createMany({
          data: validatedData.sucursales.map(sucursalId => ({
            usuarioId: id,
            sucursalId: sucursalId
          }))
        })
      }

      // Obtener usuario actualizado con sucursales
      const usuarioCompleto = await prisma.usuario.findUnique({
        where: { id },
        include: {
          sucursales: {
            include: {
              sucursal: {
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
        accion: getAccionAuditoria('UPDATE', 'usuario'),
        tabla: 'usuarios',
        registroId: id,
        datosAnteriores: sanitizeDataForAudit({
          ...usuarioActual,
          password: '[REDACTED]'
        }),
        datosNuevos: sanitizeDataForAudit({
          ...usuarioCompleto,
          password: '[REDACTED]'
        }),
        ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        dispositivo: 'web'
      })

      return NextResponse.json({
        success: true,
        data: {
          id: usuarioCompleto!.id,
          email: usuarioCompleto!.email,
          nombre: usuarioCompleto!.nombre,
          apellido: usuarioCompleto!.apellido,
          telefono: usuarioCompleto!.telefono,
          rol: usuarioCompleto!.rol,
          activo: usuarioCompleto!.activo,
          sucursales: usuarioCompleto!.sucursales.map(us => ({
            id: us.sucursal.id,
            nombre: us.sucursal.nombre
          }))
        },
        message: 'Usuario actualizado exitosamente'
      })
    }

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('UPDATE', 'usuario'),
      tabla: 'usuarios',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit({
        ...usuarioActual,
        password: '[REDACTED]'
      }),
      datosNuevos: sanitizeDataForAudit({
        ...usuarioActualizado,
        password: '[REDACTED]'
      }),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: {
        id: usuarioActualizado.id,
        email: usuarioActualizado.email,
        nombre: usuarioActualizado.nombre,
        apellido: usuarioActualizado.apellido,
        telefono: usuarioActualizado.telefono,
        rol: usuarioActualizado.rol,
        activo: usuarioActualizado.activo,
        sucursales: usuarioActualizado.sucursales.map(us => ({
          id: us.sucursal.id,
          nombre: us.sucursal.nombre
        }))
      },
      message: 'Usuario actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al actualizar usuario:', error)
    
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

