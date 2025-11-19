import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth'
import { ensurePermissionsCatalog, getEffectivePermissionsForUser } from '@/lib/permissions-service'

const permisosOverrideSchema = z.object({
  permisoId: z.string(),
  permitido: z.boolean()
})

const usuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().min(1, 'Apellido es requerido'),
  telefono: z.string().optional(),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  rol: z.enum(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION']),
  sucursales: z.array(z.string()).min(1, 'Al menos una sucursal es requerida'),
  paquetePermisosId: z.string().optional(),
  permisosPersonalizados: z.array(permisosOverrideSchema).optional()
})

async function asegurarPaqueteParaRol(rol: string, paqueteSolicitado?: string | null) {
  await ensurePermissionsCatalog()

  if (paqueteSolicitado) {
    const paquete = await prisma.paquetePermisos.findUnique({
      where: { id: paqueteSolicitado }
    })

    if (!paquete) {
      throw new Error('Paquete de permisos no encontrado')
    }

    if (paquete.rolBase !== rol) {
      throw new Error('El paquete seleccionado no corresponde al rol del usuario')
    }

    return paquete.id
  }

  const paqueteDefault = await prisma.paquetePermisos.findFirst({
    where: {
      rolBase: rol,
      esPersonalizado: false
    }
  })

  return paqueteDefault?.id || null
}

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

// GET - Obtener usuarios
export async function GET(request: NextRequest) {
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

    const usuarios = await prisma.usuario.findMany({
      where: {
        activo: true
      },
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
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    const usuariosFiltrados = user.rol === 'SUPER_ADMIN'
      ? usuarios
      : usuarios.filter(u =>
          u.sucursales.some(us =>
            user.sucursales.some(s => s.id === us.sucursalId)
          )
        )

    const usuariosConPermisos = await Promise.all(
      usuariosFiltrados.map(async (usuario) => {
        const permisos = await getEffectivePermissionsForUser(usuario.id)
        return mapUsuarioResponse(usuario, permisos)
      })
    )

    return NextResponse.json({
      success: true,
      data: usuariosConPermisos
    })
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear usuario
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const body = await request.json()

    const validatedData = usuarioSchema.parse(body)

    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear usuarios' },
        { status: 403 }
      )
    }

    if (user.rol !== 'SUPER_ADMIN') {
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

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: validatedData.email }
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un usuario con este email' },
        { status: 400 }
      )
    }

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

    const paquetePermisosId = await asegurarPaqueteParaRol(
      validatedData.rol,
      validatedData.paquetePermisosId
    )

    const hashedPassword = await hashPassword(validatedData.password)

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email: validatedData.email,
        nombre: validatedData.nombre,
        apellido: validatedData.apellido,
        telefono: validatedData.telefono,
        password: hashedPassword,
        rol: validatedData.rol,
        paquetePermisosId
      }
    })

    await prisma.usuarioSucursal.createMany({
      data: validatedData.sucursales.map(sucursalId => ({
        usuarioId: nuevoUsuario.id,
        sucursalId
      }))
    })

    if (validatedData.permisosPersonalizados?.length) {
      await prisma.usuarioPermiso.createMany({
        data: validatedData.permisosPersonalizados.map(permiso => ({
          usuarioId: nuevoUsuario.id,
          permisoId: permiso.permisoId,
          permitido: permiso.permitido
        }))
      })
    }

    const usuarioCompleto = await prisma.usuario.findUnique({
      where: { id: nuevoUsuario.id },
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

    const permisos = await getEffectivePermissionsForUser(nuevoUsuario.id)

    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('CREATE', 'usuario'),
      tabla: 'usuarios',
      registroId: nuevoUsuario.id,
      datosNuevos: sanitizeDataForAudit({
        ...usuarioCompleto,
        permisosPersonalizados: validatedData.permisosPersonalizados ?? [],
        password: '[REDACTED]'
      }),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: mapUsuarioResponse(usuarioCompleto, permisos),
      message: 'Usuario creado exitosamente'
    })
  } catch (error: any) {
    console.error('Error al crear usuario:', error)

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
