import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensurePermissionsCatalog } from '@/lib/permissions-service'
import { getUserFromToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)

    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para consultar paquetes de permisos' },
        { status: 403 }
      )
    }

    await ensurePermissionsCatalog()

    const paquetes = await prisma.paquetePermisos.findMany({
      include: {
        permisos: {
          include: {
            permiso: true
          }
        }
      },
      orderBy: [
        { rolBase: 'asc' },
        { nombre: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: paquetes.map(paquete => ({
        id: paquete.id,
        nombre: paquete.nombre,
        descripcion: paquete.descripcion,
        rolBase: paquete.rolBase,
        esPersonalizado: paquete.esPersonalizado,
        permisos: paquete.permisos.map(detalle => ({
          permisoId: detalle.permisoId,
          clave: detalle.permiso.clave,
          nombre: detalle.permiso.nombre,
          descripcion: detalle.permiso.descripcion,
          categoria: detalle.permiso.categoria,
          permitido: detalle.permitido
        }))
      }))
    })
  } catch (error: any) {
    console.error('Error al obtener paquetes de permisos:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}






