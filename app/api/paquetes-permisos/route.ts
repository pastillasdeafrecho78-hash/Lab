import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)

    // Obtener todos los paquetes de permisos con sus detalles
    const paquetes = await prisma.paquetePermisos.findMany({
      include: {
        permisos: {
          include: {
            permiso: {
              select: {
                id: true,
                clave: true,
                nombre: true,
                descripcion: true,
                categoria: true
              }
            }
          },
          orderBy: {
            permiso: {
              nombre: 'asc'
            }
          }
        }
      },
      orderBy: [
        { rolBase: 'asc' },
        { nombre: 'asc' }
      ]
    })

    // Transformar la respuesta para que coincida con la interfaz esperada en el frontend
    const paquetesFormateados = paquetes.map(paquete => ({
      id: paquete.id,
      nombre: paquete.nombre,
      descripcion: paquete.descripcion,
      rolBase: paquete.rolBase,
      permisos: paquete.permisos.map(detalle => ({
        permisoId: detalle.permisoId,
        clave: detalle.permiso.clave,
        nombre: detalle.permiso.nombre,
        descripcion: detalle.permiso.descripcion,
        permitido: detalle.permitido
      }))
    }))

    return NextResponse.json({
      success: true,
      data: paquetesFormateados
    })
  } catch (error: any) {
    console.error('Error al obtener paquetes de permisos:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
