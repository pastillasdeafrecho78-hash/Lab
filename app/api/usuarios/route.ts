import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth'

const usuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().min(1, 'Apellido es requerido'),
  telefono: z.string().optional(),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  rol: z.enum(['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION']),
  sucursales: z.array(z.string()).min(1, 'Al menos una sucursal es requerida')
})

// GET - Obtener usuarios
export async function GET(request: NextRequest) {
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
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    // Filtrar usuarios según permisos
    const usuariosFiltrados = user.rol === 'SUPER_ADMIN' 
      ? usuarios 
      : usuarios.filter(u => 
          u.sucursales.some(us => 
            user.sucursales.some(s => s.id === us.sucursalId)
          )
        )

    return NextResponse.json({
      success: true,
      data: usuariosFiltrados.map(u => ({
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        apellido: u.apellido,
        telefono: u.telefono,
        rol: u.rol,
        activo: u.activo,
        ultimoAcceso: u.ultimoAcceso,
        sucursales: u.sucursales.map(us => ({
          id: us.sucursal.id,
          nombre: us.sucursal.nombre
        }))
      }))
    })

  } catch (error: any) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
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

    // Validar datos
    const validatedData = usuarioSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear usuarios' },
        { status: 403 }
      )
    }

    // Verificar acceso a las sucursales
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

    // Verificar si el email ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: validatedData.email }
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un usuario con este email' },
        { status: 400 }
      )
    }

    // Verificar que las sucursales existen
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

    // Hash de la contraseña
    const hashedPassword = await hashPassword(validatedData.password)

    // Crear usuario
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email: validatedData.email,
        nombre: validatedData.nombre,
        apellido: validatedData.apellido,
        telefono: validatedData.telefono,
        password: hashedPassword,
        rol: validatedData.rol
      }
    })

    // Asignar sucursales
    await prisma.usuarioSucursal.createMany({
      data: validatedData.sucursales.map(sucursalId => ({
        usuarioId: nuevoUsuario.id,
        sucursalId: sucursalId
      }))
    })

    // Obtener usuario completo
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
        }
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('CREATE', 'usuario'),
      tabla: 'usuarios',
      registroId: nuevoUsuario.id,
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
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
