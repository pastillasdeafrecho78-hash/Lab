import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { notificarResultadosCompletados } from '@/lib/notifications'
import { z } from 'zod'

const resultadosComandaSchema = z.object({
  resultados: z.array(z.object({
    elemento: z.string(),
    valor: z.number(),
    unidad: z.string(),
    rangoNormal: z.string(),
    observaciones: z.string().optional()
  })).min(1, 'Al menos un resultado es requerido')
})

// POST - Registrar múltiples resultados para una comanda
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
    const { id: comandaId } = params
    const body = await request.json()

    // Validar datos
    const validatedData = resultadosComandaSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para registrar resultados' },
        { status: 403 }
      )
    }

    // Verificar que la comanda existe y está en proceso
    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
      include: {
        sucursal: true,
        tipoPrueba: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        }
      }
    })

    if (!comanda) {
      return NextResponse.json(
        { success: false, error: 'Comanda no encontrada' },
        { status: 404 }
      )
    }

    if (comanda.estado !== 'EN_PROCESO') {
      return NextResponse.json(
        { success: false, error: 'La comanda debe estar en proceso para registrar resultados' },
        { status: 400 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && user.sucursales && Array.isArray(user.sucursales) && !user.sucursales.some(s => s.id === comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta comanda' },
        { status: 403 }
      )
    }

    // Verificar que todos los elementos están en la lista de elementos de la comanda
    const elementosInvalidos = validatedData.resultados.filter(resultado => 
      !comanda.elementos.includes(resultado.elemento)
    )

    if (elementosInvalidos.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Algunos elementos no están incluidos en esta comanda' },
        { status: 400 }
      )
    }

    // Verificar si ya existen resultados para algunos elementos
    const resultadosExistentes = await prisma.resultado.findMany({
      where: {
        comandaId: comandaId,
        elemento: {
          in: validatedData.resultados.map(r => r.elemento)
        }
      }
    })

    if (resultadosExistentes.length > 0) {
      const elementosExistentes = resultadosExistentes.map(r => r.elemento)
      return NextResponse.json(
        { success: false, error: `Ya existen resultados para: ${elementosExistentes.join(', ')}` },
        { status: 400 }
      )
    }

    // Crear resultados
    const resultados = await prisma.resultado.createMany({
      data: validatedData.resultados.map(resultado => ({
        comandaId: comandaId,
        elemento: resultado.elemento,
        valor: resultado.valor,
        unidad: resultado.unidad,
        rangoNormal: resultado.rangoNormal,
        observaciones: resultado.observaciones,
        registradoPorId: user.id
      }))
    })

    // Verificar si todos los elementos de la comanda tienen resultados
    const todosLosResultados = await prisma.resultado.findMany({
      where: { comandaId: comandaId }
    })

    const elementosCompletados = todosLosResultados.map(r => r.elemento)
    const todosCompletados = comanda.elementos.every(elemento => 
      elementosCompletados.includes(elemento)
    )

    // Si todos los elementos están completados, marcar comanda como completada
    if (todosCompletados) {
      await prisma.comanda.update({
        where: { id: comandaId },
        data: {
          estado: 'COMPLETADA',
          fechaCompletado: new Date()
        }
      })
    }

    // Notificar si se completaron todos los resultados
    if (todosCompletados) {
      await notificarResultadosCompletados(
        comandaId,
        comanda.sucursalId,
        `${comanda.cliente.nombre} ${comanda.cliente.apellido}`,
        comanda.cliente.email,
        comanda.numeroComanda
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        resultadosCreados: resultados.count,
        comandaCompletada: todosCompletados
      },
      message: `${resultados.count} resultados registrados exitosamente`
    })

  } catch (error: any) {
    console.error('Error al crear resultados:', error)
    console.error('Stack trace:', error.stack)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
