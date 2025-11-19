import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { hashPassword } from '@/lib/auth'
import { ensurePermissionsCatalog, getEffectivePermissionsForUser } from '@/lib/permissions-service'
import { z } from 'zod'

const permisosOverrideSchema = z.object({
  permisoId: z.string(),
  permitido: z.boolean()
})

const usuarioUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').optional(),
  apellido: z.string().min(1, 'Apellido es requerido').optional(),
  telefono: z.string().optional(),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres').optional(),
  rol: z.enum(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION']).optional(),
  sucursales: z.array(z.string()).min(1, 'Al menos una sucursal es requerida').optional(),
  paquetePermisosId: z.string().optional().nullable(),
  permisosPersonalizados: z.array(permisosOverrideSchema).optional()
})

function mapUsuarioResponse(usuario: any, permisos: string[]) {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    telefono: usuario.telefono,
    rol: usuario.rol,
    activo: usuario.activo,
    ultimoAcceso: usuario.ultimoAcceso,
    sucursales: usuario.sucursales.map((us: any) => ({
      id: us.sucursal.id,
      nombre: us.sucursal.nombre
    })),
    paquetePermisos: usuario.paquetePermisos
      ? {
          id: usuario.paquetePermisos.id,
          nombre: usuario.paquetePermisos.nombre
        }
      : null,
    permisos
  }
}

async function obtenerUsuarioDetallado(id: string) {
  return prisma.usuario.findUnique({
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
      },
      paquetePermisos: {
        select: {
          id: true,
          nombre: true
        }
      }
    }
  })
}

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

    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para ver usuarios' },
        { status: 403 }
      )
    }

    await ensurePermissionsCatalog()

    const usuario = await obtenerUsuarioDetallado(params.id)

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

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

    const permisos = await getEffectivePermissionsForUser(usuario.id)

    return NextResponse.json({
      success: true,
      data: mapUsuarioResponse(usuario, permisos)
    })
  } catch (error: any) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

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

    const validatedData = usuarioUpdateSchema.parse(body)

    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para actualizar usuarios' },
        { status: 403 }
      )
    }

    await ensurePermissionsCatalog()

    const usuarioActual = await obtenerUsuarioDetallado(id)

    if (!usuarioActual) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

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

    let paquetePermisosId = usuarioActual.paquetePermisos?.id ?? null
    const nuevoRol = validatedData.rol ?? usuarioActual.rol

    if (validatedData.paquetePermisosId !== undefined) {
      if (validatedData.paquetePermisosId === null) {
        paquetePermisosId = null
      } else {
        const paquete = await prisma.paquetePermisos.findUnique({
          where: { id: validatedData.paquetePermisosId }
        })

        if (!paquete) {
          return NextResponse.json(
            { success: false, error: 'Paquete de permisos no encontrado' },
            { status: 400 }
          )
        }

        if (paquete.rolBase !== nuevoRol) {
          return NextResponse.json(
            { success: false, error: 'El paquete seleccionado no corresponde al rol del usuario' },
            { status: 400 }
          )
        }

        paquetePermisosId = paquete.id
      }
    }

    const updateData: any = {}
    if (validatedData.nombre) updateData.nombre = validatedData.nombre
    if (validatedData.apellido) updateData.apellido = validatedData.apellido
    if (validatedData.telefono !== undefined) updateData.telefono = validatedData.telefono
    if (validatedData.rol) updateData.rol = validatedData.rol
    if (validatedData.password) {
      updateData.password = await hashPassword(validatedData.password)
    }
    updateData.paquetePermisosId = paquetePermisosId

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
        },
        paquetePermisos: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    if (validatedData.sucursales) {
      await prisma.usuarioSucursal.deleteMany({
        where: { usuarioId: id }
      })

      if (validatedData.sucursales.length > 0) {
        await prisma.usuarioSucursal.createMany({
          data: validatedData.sucursales.map(sucursalId => ({
            usuarioId: id,
            sucursalId
          }))
        })
      }
    }

    if (validatedData.permisosPersonalizados) {
      await prisma.usuarioPermiso.deleteMany({
        where: { usuarioId: id }
      })

      if (validatedData.permisosPersonalizados.length > 0) {
        await prisma.usuarioPermiso.createMany({
          data: validatedData.permisosPersonalizados.map(permiso => ({
            usuarioId: id,
            permisoId: permiso.permisoId,
            permitido: permiso.permitido
          }))
        })
      }
    }

    const usuarioConRelations = await obtenerUsuarioDetallado(id)
    const permisos = await getEffectivePermissionsForUser(id)

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
        ...usuarioConRelations,
        password: '[REDACTED]',
        permisosPersonalizados: validatedData.permisosPersonalizados ?? []
      }),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: mapUsuarioResponse(usuarioConRelations, permisos),
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
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

