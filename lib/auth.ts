import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { ensurePermissionsCatalog, getEffectivePermissionsForUser } from './permissions-service'
import { Rol } from '@prisma/client'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'


export interface JWTPayload {
  userId: string
  email: string
  rol: Rol
  sucursales: string[]
  permisos: string[]
  paquetePermisosId?: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

// Función para verificar token en Edge Runtime (middleware)
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    if (!JWT_SECRET) {
      return null
    }
    
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      rol: payload.rol as Rol,
      sucursales: (payload.sucursales as string[]) || [],
      permisos: (payload.permisos as string[]) || [],
      paquetePermisosId: (payload.paquetePermisosId as string) || null
    }
  } catch (error: any) {
    return null
  }
}

// Función para verificar token en Node.js runtime (rutas API)
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error: any) {
    return null
  }
}

export async function authenticateUser(email: string, password: string) {
  // Normalizar email (trim y lowercase)
  const normalizedEmail = email.trim().toLowerCase()

  // Sincronizar catálogo de permisos (no bloquear si falla)
  try {
    await ensurePermissionsCatalog()
  } catch (error) {
    console.error('[AUTH] Error al sincronizar catálogo de permisos:', error)
    // Continuar con la autenticación aunque falle la sincronización
  }

  const user = await prisma.usuario.findUnique({
    where: { email: normalizedEmail },
    include: {
      sucursales: {
        include: {
          sucursal: true
        }
      }
    }
  })

  if (!user) {
    console.error(`[AUTH] Usuario no encontrado: ${normalizedEmail}`)
    throw new Error('Credenciales inválidas')
  }

  if (!user.activo) {
    console.error(`[AUTH] Usuario inactivo: ${normalizedEmail}`)
    throw new Error('Credenciales inválidas')
  }

  const isValidPassword = await verifyPassword(password, user.password)
  if (!isValidPassword) {
    console.error(`[AUTH] Contraseña inválida para: ${normalizedEmail}`)
    throw new Error('Credenciales inválidas')
  }

  // Actualizar último acceso
  await prisma.usuario.update({
    where: { id: user.id },
    data: {
      ultimoAcceso: new Date(),
      ipUltimoAcceso: '127.0.0.1' // TODO: Obtener IP real
    }
  })

  const permisos = await getEffectivePermissionsForUser(user.id)

  const tokenPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    rol: user.rol,
    sucursales: user.sucursales.map(us => us.sucursalId),
    permisos,
    paquetePermisosId: user.paquetePermisosId
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
      sucursales: user.sucursales.map(us => ({
        id: us.sucursal.id,
        nombre: us.sucursal.nombre
      })),
      permisos,
      paquetePermisosId: user.paquetePermisosId
    },
    token: generateToken(tokenPayload)
  }
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token)
  if (!payload) {
    throw new Error('Token inválido')
  }

  const user = await prisma.usuario.findUnique({
    where: { id: payload.userId },
    include: {
      sucursales: {
        include: {
          sucursal: true
        }
      },
      paquetePermisos: {
        include: {
          permisos: {
            include: {
              permiso: true
            }
          }
        }
      },
      permisosPersonalizados: {
        include: {
          permiso: true
        }
      }
    }
  })

  if (!user || !user.activo) {
    throw new Error('Usuario no encontrado o inactivo')
  }

  const permisos = await getEffectivePermissionsForUser(user.id)

  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    rol: user.rol,
    sucursales: user.sucursales.map(us => ({
      id: us.sucursal.id,
      nombre: us.sucursal.nombre
    })),
    permisos,
    paquetePermisosId: user.paquetePermisosId
  }
}

export function hasPermission(userRol: Rol, requiredRoles: Rol[]): boolean {
  return requiredRoles.includes(userRol)
}

export function canAccessSucursal(userSucursales: string[], sucursalId: string): boolean {
  return userSucursales.includes(sucursalId)
}
