import { prisma } from '@/lib/prisma'
import { Rol } from '@prisma/client'
import { DEFAULT_PERMISSION_PACKAGES, PERMISSIONS_DEFINITIONS } from './permissions-data'

let catalogoSincronizado = false

export async function syncPermissionsCatalog() {
  for (const permiso of PERMISSIONS_DEFINITIONS) {
    await prisma.permiso.upsert({
      where: { clave: permiso.clave },
      update: {
        nombre: permiso.nombre,
        descripcion: permiso.descripcion,
        categoria: permiso.categoria
      },
      create: {
        clave: permiso.clave,
        nombre: permiso.nombre,
        descripcion: permiso.descripcion,
        categoria: permiso.categoria
      }
    })
  }

  for (const paquete of DEFAULT_PERMISSION_PACKAGES) {
    const paqueteDb = await prisma.paquetePermisos.upsert({
      where: {
        nombre: paquete.nombre
      },
      update: {
        descripcion: paquete.descripcion,
        rolBase: paquete.rolBase
      },
      create: {
        nombre: paquete.nombre,
        descripcion: paquete.descripcion,
        rolBase: paquete.rolBase,
        esPersonalizado: false
      }
    })

    const permisosDb = await prisma.permiso.findMany({
      where: {
        clave: {
          in: Object.keys(paquete.permisos)
        }
      }
    })

    // Limpiar relaciones existentes para sincronizar definiciones por defecto
    await prisma.paquetePermisoDetalle.deleteMany({
      where: {
        paqueteId: paqueteDb.id
      }
    })

    await prisma.paquetePermisoDetalle.createMany({
      data: permisosDb.map(permiso => ({
        paqueteId: paqueteDb.id,
        permisoId: permiso.id,
        permitido: paquete.permisos[permiso.clave] ?? false
      }))
    })
  }
}

export async function getEffectivePermissionsForUser(userId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      rol: true,
      paquetePermisosId: true,
      paquetePermisos: {
        select: {
          id: true,
          permisos: {
            select: {
              permitido: true,
              permiso: {
                select: {
                  clave: true
                }
              }
            }
          }
        }
      },
      permisosPersonalizados: {
        select: {
          permitido: true,
          permiso: {
            select: {
              clave: true
            }
          }
        }
      }
    }
  })

  if (!usuario) {
    return []
  }

  const permisos = new Map<string, boolean>()

  if (usuario.paquetePermisos) {
    for (const permiso of usuario.paquetePermisos.permisos) {
      permisos.set(permiso.permiso.clave, permiso.permitido)
    }
  } else {
    // Si el usuario no tiene paquete asignado, usar el paquete por defecto de su rol base
    const paquetePorRol = await prisma.paquetePermisos.findFirst({
      where: {
        rolBase: usuario.rol,
        esPersonalizado: false
      },
      include: {
        permisos: {
          include: {
            permiso: true
          }
        }
      }
    })

    if (paquetePorRol) {
      for (const permiso of paquetePorRol.permisos) {
        permisos.set(permiso.permiso.clave, permiso.permitido)
      }
    }
  }

  // Aplicar overrides personalizados
  for (const override of usuario.permisosPersonalizados) {
    permisos.set(override.permiso.clave, override.permitido)
  }

  // Para usuarios sin paquete ni overrides, garantizar permisos por rol básico
  if (permisos.size === 0) {
    const defaults = DEFAULT_PERMISSION_PACKAGES.find(pkg => pkg.rolBase === usuario.rol)
    if (defaults) {
      for (const [clave, permitido] of Object.entries(defaults.permisos)) {
        permisos.set(clave, permitido)
      }
    }
  }

  return Array.from(permisos.entries())
    .filter(([, permitido]) => permitido)
    .map(([clave]) => clave)
}

export function hasPermission(permisos: string[], permisoClave: string) {
  return permisos.includes(permisoClave)
}

export function hasAnyPermission(permisos: string[], claves: string[]) {
  return claves.some(clave => permisos.includes(clave))
}

export function filterPackagesByRolBase<T extends { rolBase: Rol }>(packages: T[], rol: Rol) {
  return packages.filter(pkg => pkg.rolBase === rol)
}

export async function ensurePermissionsCatalog() {
  if (catalogoSincronizado) {
    return
  }

  await syncPermissionsCatalog()
  catalogoSincronizado = true
}

