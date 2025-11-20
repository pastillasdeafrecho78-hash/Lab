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
        { success: false, error: 'Sin permisos para consultar permisos' },
        { status: 403 }
      )
    }

    await ensurePermissionsCatalog()

    const permisos = await prisma.permiso.findMany({
      orderBy: [
        { categoria: 'asc' },
        { nombre: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: permisos.map(permiso => ({
        id: permiso.id,
        clave: permiso.clave,
        nombre: permiso.nombre,
        descripcion: permiso.descripcion,
        categoria: permiso.categoria
      }))
    })
  } catch (error: any) {
    console.error('Error al obtener permisos:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}






