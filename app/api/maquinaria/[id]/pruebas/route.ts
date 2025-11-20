import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const asignarPruebaSchema = z.object({
  tipoPruebaId: z.string().min(1, 'Tipo de prueba es requerido')
})

// POST - Asignar prueba a maquinaria
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { id: maquinariaId } = params
    const body = await request.json()

    // Validar datos
    const validatedData = asignarPruebaSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para asignar pruebas' },
        { status: 403 }
      )
    }

    // Verificar que la maquinaria existe
    const maquinaria = await prisma.maquinaria.findUnique({
      where: { id: maquinariaId },
      include: {
        sucursal: true
      }
    })

    if (!maquinaria) {
      return NextResponse.json(
        { success: false, error: 'Maquinaria no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === maquinaria.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta maquinaria' },
        { status: 403 }
      )
    }

    // Verificar que el tipo de prueba existe
    const tipoPrueba = await prisma.tipoPrueba.findUnique({
      where: { id: validatedData.tipoPruebaId }
    })

    if (!tipoPrueba) {
      return NextResponse.json(
        { success: false, error: 'Tipo de prueba no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si ya existe la asignación
    const asignacionExistente = await prisma.pruebaMaquinaria.findUnique({
      where: {
        tipoPruebaId_maquinariaId: {
          tipoPruebaId: validatedData.tipoPruebaId,
          maquinariaId: maquinariaId
        }
      }
    })

    if (asignacionExistente) {
      return NextResponse.json(
        { success: false, error: 'Esta prueba ya está asignada a esta maquinaria' },
        { status: 400 }
      )
    }

    // Crear asignación
    const asignacion = await prisma.pruebaMaquinaria.create({
      data: {
        tipoPruebaId: validatedData.tipoPruebaId,
        maquinariaId: maquinariaId
      },
      include: {
        tipoPrueba: {
          select: {
            id: true,
            nombre: true
          }
        },
        maquinaria: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: 'ASIGNAR_PRUEBA_MAQUINARIA',
      tabla: 'prueba_maquinaria',
      registroId: asignacion.id,
      datosNuevos: sanitizeDataForAudit(asignacion),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: asignacion,
      message: 'Prueba asignada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al asignar prueba:', error)
    
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

// DELETE - Desasignar prueba de maquinaria
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { id: maquinariaId } = params
    const { searchParams } = new URL(request.url)
    const tipoPruebaId = searchParams.get('tipoPruebaId')

    if (!tipoPruebaId) {
      return NextResponse.json(
        { success: false, error: 'ID de tipo de prueba requerido' },
        { status: 400 }
      )
    }

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para desasignar pruebas' },
        { status: 403 }
      )
    }

    // Verificar que la asignación existe
    const asignacion = await prisma.pruebaMaquinaria.findUnique({
      where: {
        tipoPruebaId_maquinariaId: {
          tipoPruebaId: tipoPruebaId,
          maquinariaId: maquinariaId
        }
      },
      include: {
        maquinaria: {
          include: {
            sucursal: true
          }
        },
        tipoPrueba: true
      }
    })

    if (!asignacion) {
      return NextResponse.json(
        { success: false, error: 'Asignación no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === asignacion.maquinaria.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta maquinaria' },
        { status: 403 }
      )
    }

    // Eliminar asignación
    await prisma.pruebaMaquinaria.delete({
      where: {
        tipoPruebaId_maquinariaId: {
          tipoPruebaId: tipoPruebaId,
          maquinariaId: maquinariaId
        }
      }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: 'DESASIGNAR_PRUEBA_MAQUINARIA',
      tabla: 'prueba_maquinaria',
      registroId: asignacion.id,
      datosAnteriores: sanitizeDataForAudit(asignacion),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      message: 'Prueba desasignada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al desasignar prueba:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
