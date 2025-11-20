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

    // Obtener todos los permisos del catálogo
    const permisos = await prisma.permiso.findMany({
      orderBy: [
        { categoria: 'asc' },
        { nombre: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: permisos
    })
  } catch (error: any) {
    console.error('Error al obtener permisos:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
