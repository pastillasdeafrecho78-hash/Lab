import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

// GET - Obtener sucursal por ID
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

    const sucursal = await prisma.sucursal.findUnique({
      where: { id: params.id },
      include: {
        usuarios: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                telefono: true,
                rol: true,
                activo: true
              }
            }
          }
        },
        maquinaria: {
          include: {
            pruebas: {
              include: {
                tipoPrueba: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            comandas: true,
            usuarios: true,
            maquinaria: true
          }
        }
      }
    })

    if (!sucursal) {
      return NextResponse.json(
        { success: false, error: 'Sucursal no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso (solo super admin o usuarios de esa sucursal)
    if (user.rol !== 'SUPER_ADMIN') {
      const tieneAcceso = user.sucursales.some(us => us.id === sucursal.id)
      if (!tieneAcceso) {
        return NextResponse.json(
          { success: false, error: 'Sin acceso a esta sucursal' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: sucursal
    })

  } catch (error: any) {
    console.error('Error al obtener sucursal:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

