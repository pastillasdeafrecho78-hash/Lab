import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

// GET - Obtener estadísticas para reportes
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { searchParams } = new URL(request.url)
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')
    const sucursalId = searchParams.get('sucursalId')

    // Construir filtros de fecha
    const fechaFilter: any = {}
    if (fechaInicio) {
      fechaFilter.gte = new Date(fechaInicio)
    }
    if (fechaFin) {
      const fechaFinDate = new Date(fechaFin)
      fechaFinDate.setHours(23, 59, 59, 999)
      fechaFilter.lte = fechaFinDate
    }

    // Construir where para comandas
    const whereComandas: any = {}
    if (Object.keys(fechaFilter).length > 0) {
      whereComandas.fechaCreacion = fechaFilter
    }
    if (sucursalId) {
      whereComandas.sucursalId = sucursalId
    } else if (user.rol !== 'SUPER_ADMIN') {
      whereComandas.sucursalId = {
        in: user.sucursales.map(s => s.id)
      }
    }

    // Estadísticas de comandas
    const [
      totalComandas,
      comandasPorEstado,
      comandasPorSucursal,
      comandasPorTipoPrueba,
      comandasPorDia,
      totalClientes,
      totalSucursales,
      totalUsuarios,
      comandasCompletadas,
      comandasPendientes,
      comandasEnProceso,
      comandasEntregadas
    ] = await Promise.all([
      // Total comandas
      prisma.comanda.count({ where: whereComandas }),
      
      // Comandas por estado
      prisma.comanda.groupBy({
        by: ['estado'],
        where: whereComandas,
        _count: true
      }),
      
      // Comandas por sucursal
      prisma.comanda.groupBy({
        by: ['sucursalId'],
        where: whereComandas,
        _count: true
      }),
      
      // Comandas por tipo de prueba
      prisma.comanda.groupBy({
        by: ['tipoPruebaId'],
        where: whereComandas,
        _count: true
      }),
      
      // Comandas por día (últimos 30 días)
      sucursalId 
        ? prisma.$queryRaw<Array<{ fecha: Date; cantidad: bigint }>>`
            SELECT 
              DATE(fecha_creacion) as fecha,
              COUNT(*)::int as cantidad
            FROM comandas
            WHERE fecha_creacion >= NOW() - INTERVAL '30 days'
              AND sucursal_id = ${sucursalId}
            GROUP BY DATE(fecha_creacion)
            ORDER BY fecha ASC
          `
        : prisma.$queryRaw<Array<{ fecha: Date; cantidad: bigint }>>`
            SELECT 
              DATE(fecha_creacion) as fecha,
              COUNT(*)::int as cantidad
            FROM comandas
            WHERE fecha_creacion >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(fecha_creacion)
            ORDER BY fecha ASC
          `,
      
      // Total clientes
      prisma.cliente.count({ where: { activo: true } }),
      
      // Total sucursales
      prisma.sucursal.count({ where: { activa: true } }),
      
      // Total usuarios
      prisma.usuario.count({ where: { activo: true } }),
      
      // Comandas completadas
      prisma.comanda.count({ 
        where: { ...whereComandas, estado: 'COMPLETADA' } 
      }),
      
      // Comandas pendientes
      prisma.comanda.count({ 
        where: { ...whereComandas, estado: 'PENDIENTE' } 
      }),
      
      // Comandas en proceso
      prisma.comanda.count({ 
        where: { ...whereComandas, estado: 'EN_PROCESO' } 
      }),
      
      // Comandas entregadas
      prisma.comanda.count({ 
        where: { ...whereComandas, estado: 'ENTREGADA' } 
      })
    ])

    // Obtener nombres de sucursales y tipos de prueba
    const sucursalIds = comandasPorSucursal.map(c => c.sucursalId)
    const tipoPruebaIds = comandasPorTipoPrueba.map(c => c.tipoPruebaId)

    const [sucursales, tiposPrueba] = await Promise.all([
      prisma.sucursal.findMany({
        where: { id: { in: sucursalIds } },
        select: { id: true, nombre: true }
      }),
      prisma.tipoPrueba.findMany({
        where: { id: { in: tipoPruebaIds } },
        select: { id: true, nombre: true }
      })
    ])

    // Formatear datos
    const comandasPorSucursalFormateado = comandasPorSucursal.map(c => {
      const sucursal = sucursales.find(s => s.id === c.sucursalId)
      return {
        sucursalId: c.sucursalId,
        sucursalNombre: sucursal?.nombre || 'Desconocida',
        cantidad: c._count
      }
    })

    const comandasPorTipoFormateado = comandasPorTipoPrueba.map(c => {
      const tipo = tiposPrueba.find(t => t.id === c.tipoPruebaId)
      return {
        tipoPruebaId: c.tipoPruebaId,
        tipoPruebaNombre: tipo?.nombre || 'Desconocido',
        cantidad: c._count
      }
    })

    const comandasPorEstadoFormateado = comandasPorEstado.reduce((acc, c) => {
      acc[c.estado] = c._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        resumen: {
          totalComandas,
          comandasCompletadas,
          comandasPendientes,
          comandasEnProceso,
          comandasEntregadas,
          totalClientes,
          totalSucursales,
          totalUsuarios
        },
        porEstado: comandasPorEstadoFormateado,
        porSucursal: comandasPorSucursalFormateado,
        porTipoPrueba: comandasPorTipoFormateado,
        porDia: comandasPorDia.map((item: any) => ({
          fecha: item.fecha.toISOString().split('T')[0],
          cantidad: Number(item.cantidad)
        }))
      }
    })

  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

