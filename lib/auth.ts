import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { Rol } from '@prisma/client'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'


export interface JWTPayload {
  userId: string
  email: string
  rol: Rol
  sucursales: string[]
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
      sucursales: (payload.sucursales as string[]) || []
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
  const user = await prisma.usuario.findUnique({
    where: { email },
    include: {
      sucursales: {
        include: {
          sucursal: true
        }
      }
    }
  })

  if (!user || !user.activo) {
    throw new Error('Credenciales inválidas')
  }

  const isValidPassword = await verifyPassword(password, user.password)
  if (!isValidPassword) {
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

  const tokenPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    rol: user.rol,
    sucursales: user.sucursales.map(us => us.sucursalId)
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
      }))
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
      }
    }
  })

  if (!user || !user.activo) {
    throw new Error('Usuario no encontrado o inactivo')
  }

  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    rol: user.rol,
    sucursales: user.sucursales.map(us => ({
      id: us.sucursal.id,
      nombre: us.sucursal.nombre
    }))
  }
}

export function hasPermission(userRol: Rol, requiredRoles: Rol[]): boolean {
  return requiredRoles.includes(userRol)
}

export function canAccessSucursal(userSucursales: string[], sucursalId: string): boolean {
  return userSucursales.includes(sucursalId)
}
