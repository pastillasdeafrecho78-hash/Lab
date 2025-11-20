import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const clienteUpdateSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').optional(),
  apellido: z.string().min(1, 'Apellido es requerido').optional(),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  genero: z.string().optional(),
  direccion: z.string().optional()
})

// GET - Obtener cliente por ID
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
    const { id } = params

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        comandas: {
          select: {
            id: true,
            numeroComanda: true,
            estado: true,
            fechaCreacion: true
          },
          orderBy: {
            fechaCreacion: 'desc'
          }
        }
      }
    })

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: cliente
    })

  } catch (error: any) {
    console.error('Error al obtener cliente:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { id } = params
    const body = await request.json()

    // Validar datos
    const validatedData = clienteUpdateSchema.parse(body)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'RECEPCION'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para actualizar clientes' },
        { status: 403 }
      )
    }

    // Obtener cliente actual para auditoría
    const clienteActual = await prisma.cliente.findUnique({
      where: { id }
    })

    if (!clienteActual) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Verificar email único si se está cambiando
    if (validatedData.email && validatedData.email !== clienteActual.email) {
      const clienteExistente = await prisma.cliente.findUnique({
        where: { email: validatedData.email }
      })

      if (clienteExistente) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un cliente con este email' },
          { status: 400 }
        )
      }
    }

    // Preparar datos de actualización
    const updateData: any = {}
    if (validatedData.nombre) updateData.nombre = validatedData.nombre
    if (validatedData.apellido) updateData.apellido = validatedData.apellido
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.telefono !== undefined) updateData.telefono = validatedData.telefono
    if (validatedData.fechaNacimiento) {
      updateData.fechaNacimiento = new Date(validatedData.fechaNacimiento)
    } else if (validatedData.fechaNacimiento === '') {
      updateData.fechaNacimiento = null
    }
    if (validatedData.genero !== undefined) updateData.genero = validatedData.genero
    if (validatedData.direccion !== undefined) updateData.direccion = validatedData.direccion

    // Actualizar cliente
    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: updateData
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('UPDATE', 'cliente'),
      tabla: 'clientes',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(clienteActual),
      datosNuevos: sanitizeDataForAudit(clienteActualizado),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: clienteActualizado,
      message: 'Cliente actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al actualizar cliente:', error)
    
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

