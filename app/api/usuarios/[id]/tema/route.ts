import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { z } from 'zod'

const temaSchema = z.object({
  primaryBase: z.string(),
  grayBase: z.string(),
  secondaryBase: z.string(),
  successBase: z.string(),
  warningBase: z.string(),
  dangerBase: z.string(),
  fontFamily: z.string().optional(),
  textPrimary: z.string(),
  textSecondary: z.string(),
  textTertiary: z.string(),
  textOnColor: z.string(),
  textOnColorSecondary: z.string()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    let user
    try {
      user = await getUserFromToken(token)
    } catch (error: any) {
      if (error.message === 'Token inválido' || error.message?.includes('Token')) {
        return NextResponse.json({ success: false, error: 'Token inválido o expirado' }, { status: 401 })
      }
      throw error
    }

    const { id } = params

    if (user.id !== id && !['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para ver esta configuración' },
        { status: 403 }
      )
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { configuracionTema: true }
    })

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: usuario.configuracionTema || null
    })
  } catch (error: any) {
    console.error('Error al obtener configuración de tema:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    let user
    try {
      user = await getUserFromToken(token)
    } catch (error: any) {
      if (error.message === 'Token inválido' || error.message?.includes('Token')) {
        return NextResponse.json({ success: false, error: 'Token inválido o expirado' }, { status: 401 })
      }
      throw error
    }

    const { id } = params

    if (user.id !== id) {
      return NextResponse.json(
        { success: false, error: 'Solo puedes actualizar tu propia configuración' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = temaSchema.parse(body)

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        configuracionTema: validatedData
      },
      select: { configuracionTema: true }
    })

    return NextResponse.json({
      success: true,
      data: usuario.configuracionTema,
      message: 'Configuración de tema guardada exitosamente'
    })
  } catch (error: any) {
    console.error('Error al guardar configuración de tema:', error)
    
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

