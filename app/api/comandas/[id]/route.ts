import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { notificarComandaActualizada } from '@/lib/notifications'
import { z } from 'zod'

const updateComandaSchema = z.object({
  estado: z.enum(['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'ENTREGADA']).optional(),
  asignadoAId: z.string().optional(),
  observaciones: z.string().optional(),
  categoriaId: z.string().optional(), // Para agregar/quitar categorías
  elementos: z.array(z.string()).optional(), // Para modificar parámetros
  archivada: z.boolean().optional() // Para archivar/desarchivar
})

// GET - Obtener comanda por ID
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

    const comanda = await prisma.comanda.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        tipoPrueba: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        asignadoA: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        resultados: {
          include: {
            registradoPor: {
              select: {
                id: true,
                nombre: true,
                apellido: true
              }
            }
          },
          orderBy: {
            fechaRegistro: 'asc'
          }
        },
        historial: {
          include: {
            modificadoPor: {
              select: {
                id: true,
                nombre: true,
                apellido: true
              }
            }
          },
          orderBy: {
            fechaModificacion: 'desc'
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

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && user.sucursales && Array.isArray(user.sucursales) && !user.sucursales.some(s => s.id === comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta comanda' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: comanda
    })

  } catch (error: any) {
    console.error('Error al obtener comanda:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar comanda
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
    const validatedData = updateComandaSchema.parse(body)

    // Obtener comanda actual con historial
    const comandaActual = await prisma.comanda.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        tipoPrueba: true,
        historial: {
          where: {
            tipoCambio: 'MODIFICAR_ESTADO'
          },
          orderBy: {
            fechaModificacion: 'desc'
          },
          take: 1
        }
      }
    })

    if (!comandaActual) {
      return NextResponse.json(
        { success: false, error: 'Comanda no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === comandaActual.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta comanda' },
        { status: 403 }
      )
    }

    // No hay restricciones de cambio de estado - el historial registra todos los cambios

    // Preparar datos de actualización
    const updateData: any = {}
    const historialEntries: Array<{
      tipoCambio: string
      campoAnterior?: string
      campoNuevo?: string
      descripcion: string
    }> = []

    // Manejar cambios de estado
    if (validatedData.estado && validatedData.estado !== comandaActual.estado) {
      updateData.estado = validatedData.estado
      historialEntries.push({
        tipoCambio: 'MODIFICAR_ESTADO',
        campoAnterior: comandaActual.estado,
        campoNuevo: validatedData.estado,
        descripcion: `Estado cambiado de ${comandaActual.estado} a ${validatedData.estado}`
      })

      // Actualizar fechas según el estado
      if (validatedData.estado === 'EN_PROCESO' && comandaActual.estado === 'PENDIENTE') {
        updateData.fechaAsignacion = new Date()
        if (validatedData.asignadoAId) {
          updateData.asignadoAId = validatedData.asignadoAId
        }
      }

      if (validatedData.estado === 'COMPLETADA' && comandaActual.estado === 'EN_PROCESO') {
        updateData.fechaCompletado = new Date()
      }

      if (validatedData.estado === 'ENTREGADA' && comandaActual.estado === 'COMPLETADA') {
        updateData.fechaEntrega = new Date()
      }
    }

    // Manejar archivo/desarchivo
    if (validatedData.archivada !== undefined) {
      if (validatedData.archivada !== comandaActual.archivada) {
        updateData.archivada = validatedData.archivada
        if (validatedData.archivada) {
          updateData.fechaArchivado = new Date()
          historialEntries.push({
            tipoCambio: 'ARCHIVAR',
            campoAnterior: 'No archivada',
            campoNuevo: 'Archivada',
            descripcion: 'Comanda archivada manualmente'
          })
        } else {
          updateData.fechaArchivado = null
          historialEntries.push({
            tipoCambio: 'DESARCHIVAR',
            campoAnterior: 'Archivada',
            campoNuevo: 'No archivada',
            descripcion: 'Comanda desarchivada'
          })
        }
      }
    }

    // Manejar cambios de asignación
    if (validatedData.asignadoAId !== undefined && validatedData.asignadoAId !== comandaActual.asignadoAId) {
      updateData.asignadoAId = validatedData.asignadoAId || null
      const anterior = comandaActual.asignadoAId || 'Sin asignar'
      const nuevo = validatedData.asignadoAId || 'Sin asignar'
      historialEntries.push({
        tipoCambio: 'MODIFICAR_ASIGNACION',
        campoAnterior: anterior,
        campoNuevo: nuevo,
        descripcion: `Asignación cambiada de ${anterior} a ${nuevo}`
      })
    }

    // Manejar cambios de observaciones
    if (validatedData.observaciones !== undefined && validatedData.observaciones !== comandaActual.observaciones) {
      updateData.observaciones = validatedData.observaciones
      historialEntries.push({
        tipoCambio: 'MODIFICAR_OBSERVACIONES',
        campoAnterior: comandaActual.observaciones || '',
        campoNuevo: validatedData.observaciones || '',
        descripcion: 'Observaciones modificadas'
      })
    }

    // Manejar cambios de elementos (parámetros)
    if (validatedData.elementos) {
      const elementosAnteriores = comandaActual.elementos
      const elementosNuevos = validatedData.elementos

      const agregados = elementosNuevos.filter(e => !elementosAnteriores.includes(e))
      const quitados = elementosAnteriores.filter(e => !elementosNuevos.includes(e))

      if (agregados.length > 0 || quitados.length > 0) {
        updateData.elementos = elementosNuevos

        if (agregados.length > 0) {
          agregados.forEach(elemento => {
            historialEntries.push({
              tipoCambio: 'AGREGAR_PARAMETRO',
              campoAnterior: null,
              campoNuevo: elemento,
              descripcion: `Parámetro "${elemento}" agregado`
            })
          })
        }

        if (quitados.length > 0) {
          quitados.forEach(elemento => {
            historialEntries.push({
              tipoCambio: 'QUITAR_PARAMETRO',
              campoAnterior: elemento,
              campoNuevo: null,
              descripcion: `Parámetro "${elemento}" quitado`
            })
          })
        }
      }
    }

    // Manejar cambios de categoría (tipoPrueba)
    if (validatedData.categoriaId) {
      // Buscar categoría
      const categoria = await prisma.categoriaAnalito.findUnique({
        where: { id: validatedData.categoriaId },
        include: {
          analitos: {
            include: { analito: true },
            orderBy: { orden: 'asc' }
          }
        }
      })

      if (categoria) {
        // Buscar o crear TipoPrueba para esta categoría
        const tipoPruebaExistente = await prisma.tipoPruebaCategoria.findFirst({
          where: { categoriaId: categoria.id },
          include: { tipoPrueba: true }
        })

        let tipoPruebaId: string
        if (tipoPruebaExistente && tipoPruebaExistente.tipoPrueba.activo) {
          tipoPruebaId = tipoPruebaExistente.tipoPrueba.id
        } else {
          const elementos = categoria.analitos.map(d => d.analito.nombre)
          const nuevoTipoPrueba = await prisma.tipoPrueba.create({
            data: {
              nombre: categoria.nombre,
              descripcion: categoria.descripcion || `Prueba basada en categoría ${categoria.nombre}`,
              elementos,
              categorias: {
                create: {
                  categoriaId: categoria.id
                }
              },
              analitosAsignados: {
                create: categoria.analitos.map(d => ({
                  analitoId: d.analito.id
                }))
              }
            }
          })
          tipoPruebaId = nuevoTipoPrueba.id
        }

        if (tipoPruebaId !== comandaActual.tipoPruebaId) {
          const tipoPruebaAnterior = await prisma.tipoPrueba.findUnique({
            where: { id: comandaActual.tipoPruebaId },
            select: { nombre: true }
          })

          updateData.tipoPruebaId = tipoPruebaId
          historialEntries.push({
            tipoCambio: 'MODIFICAR_CATEGORIA',
            campoAnterior: tipoPruebaAnterior?.nombre || comandaActual.tipoPruebaId,
            campoNuevo: categoria.nombre,
            descripcion: `Categoría cambiada de "${tipoPruebaAnterior?.nombre || 'anterior'}" a "${categoria.nombre}"`
          })
        }
      }
    }

    // Actualizar comanda
    const comandaActualizada = await prisma.comanda.update({
      where: { id },
      data: updateData,
      include: {
        cliente: true,
        sucursal: true,
        tipoPrueba: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        asignadoA: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        resultados: {
          include: {
            registradoPor: {
              select: {
                id: true,
                nombre: true,
                apellido: true
              }
            }
          }
        },
        historial: {
          include: {
            modificadoPor: {
              select: {
                id: true,
                nombre: true,
                apellido: true
              }
            }
          },
          orderBy: {
            fechaModificacion: 'desc'
          }
        }
      }
    })

    // Registrar historial de cambios
    if (historialEntries.length > 0) {
      await prisma.comandaHistorial.createMany({
        data: historialEntries.map(entry => ({
          comandaId: id,
          tipoCambio: entry.tipoCambio,
          campoAnterior: entry.campoAnterior || null,
          campoNuevo: entry.campoNuevo || null,
          descripcion: entry.descripcion,
          modificadoPorId: user.id
        }))
      })
    }

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('UPDATE', 'comanda'),
      tabla: 'comandas',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(comandaActual),
      datosNuevos: sanitizeDataForAudit(comandaActualizada),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    // Notificar cambio de estado si hubo
    if (validatedData.estado && comandaActual.estado !== validatedData.estado) {
      await notificarComandaActualizada(
        id,
        comandaActualizada.sucursalId,
        comandaActual.estado,
        validatedData.estado,
        `${comandaActualizada.cliente.nombre} ${comandaActualizada.cliente.apellido}`
      )
    }

    return NextResponse.json({
      success: true,
      data: comandaActualizada,
      message: 'Comanda actualizada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al actualizar comanda:', error)
    
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

// DELETE - Eliminar comanda
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
    const { id } = params

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para eliminar comandas' },
        { status: 403 }
      )
    }

    // Obtener comanda
    const comanda = await prisma.comanda.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        tipoPrueba: true,
        resultados: true
      }
    })

    if (!comanda) {
      return NextResponse.json(
        { success: false, error: 'Comanda no encontrada' },
        { status: 404 }
      )
    }

    // Verificar acceso a la sucursal
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta comanda' },
        { status: 403 }
      )
    }

    // No permitir eliminar comandas con resultados
    if (comanda.resultados.length > 0) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar una comanda con resultados registrados' },
        { status: 400 }
      )
    }

    // Eliminar comanda
    await prisma.comanda.delete({
      where: { id }
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('DELETE', 'comanda'),
      tabla: 'comandas',
      registroId: id,
      datosAnteriores: sanitizeDataForAudit(comanda),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      message: 'Comanda eliminada exitosamente'
    })

  } catch (error: any) {
    console.error('Error al eliminar comanda:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
