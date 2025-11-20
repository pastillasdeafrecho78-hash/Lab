import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

// GET - Obtener un mensaje por ID
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
    const mensajeId = params.id

    const mensaje = await prisma.mensaje.findUnique({
      where: { id: mensajeId },
      include: {
        remitente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            rol: true
          }
        },
        canal: {
          select: {
            id: true,
            nombre: true,
            categoria: true
          }
        }
      }
    })

    if (!mensaje) {
      return NextResponse.json(
        { success: false, error: 'Mensaje no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mensaje
    })
  } catch (error: any) {
    console.error('Error al obtener mensaje:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
