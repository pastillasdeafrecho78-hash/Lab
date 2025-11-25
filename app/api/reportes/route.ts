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
    } else if (user.rol !== 'SUPER_ADMIN' && user.sucursales && Array.isArray(user.sucursales) && user.sucursales.length > 0) {
      whereComandas.sucursalId = {
        in: user.sucursales.map(s => s.id)
      }
    }
    whereComandas.archivada = false // No incluir archivadas en reportes

    // Estadísticas básicas
    const [
      totalComandas,
      comandasPorEstado,
      comandasPorSucursal,
      totalClientes,
      totalSucursales,
      totalUsuarios,
      comandasCompletadas,
      comandasPendientes,
      comandasEnProceso,
      comandasEntregadas,
      comandasConDatos
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
      }),

      // Comandas con datos para análisis de elementos
      prisma.comanda.findMany({
        where: whereComandas,
        select: {
          id: true,
          elementos: true,
          tipoPruebaId: true,
          tipoPrueba: {
            select: {
              id: true,
              nombre: true
            }
          },
          fechaCreacion: true,
          fechaCompletado: true,
          fechaEntrega: true
        }
      })
    ])

    // Obtener nombres de sucursales (incluir inactivas para comandas históricas)
    const sucursalIds = comandasPorSucursal.map(c => c.sucursalId)
    const sucursales = await prisma.sucursal.findMany({
      where: { id: { in: sucursalIds } },
      select: { id: true, nombre: true, activa: true }
    })

    // Formatear datos por sucursal
    const comandasPorSucursalFormateado = comandasPorSucursal.map(c => {
      const sucursal = sucursales.find(s => s.id === c.sucursalId)
      return {
        sucursalId: c.sucursalId,
        sucursalNombre: sucursal?.nombre || 'Desconocida',
        cantidad: c._count
      }
    })

    // Formatear datos por estado
    const comandasPorEstadoFormateado = comandasPorEstado.reduce((acc, c) => {
      const estadoLabels: Record<string, string> = {
        'PENDIENTE': 'Registrada',
        'EN_PROCESO': 'En Proceso',
        'COMPLETADA': 'Finalizada',
        'ENTREGADA': 'Entregada'
      }
      acc[estadoLabels[c.estado] || c.estado] = c._count
      return acc
    }, {} as Record<string, number>)

    // Analizar elementos (categorías y analitos más solicitados)
    const elementosCount: Record<string, number> = {}
    const categoriasCount: Record<string, number> = {}
    
    comandasConDatos.forEach(comanda => {
      if (comanda.elementos && Array.isArray(comanda.elementos)) {
        comanda.elementos.forEach(elemento => {
          if (elemento) {
            elementosCount[elemento] = (elementosCount[elemento] || 0) + 1
          }
        })
      }
    })

    // Obtener categorías y analitos para identificar
    let categorias: Array<{ id: string; nombre: string }> = []
    let analitos: Array<{
      id: string
      nombre: string
      categorias: Array<{
        categoria: {
          id: string
          nombre: string
        }
      }>
    }> = []

    try {
      [categorias, analitos] = await Promise.all([
        prisma.categoriaAnalito.findMany({
          select: { id: true, nombre: true }
        }),
        // Incluir analitos inactivos para poder encontrar los que están en comandas históricas
        prisma.analito.findMany({
          include: {
            categorias: {
              include: {
                categoria: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          }
        })
      ])
    } catch (error: any) {
      console.error('Error al obtener categorías y analitos:', error)
      // Continuar con arrays vacíos si falla
      categorias = []
      analitos = []
    }

    // Contar por categoría
    // Los elementos son nombres de analitos, no IDs
    analitos.forEach(analito => {
      if (elementosCount[analito.nombre]) {
        // Un analito puede estar en múltiples categorías
        if (analito.categorias && analito.categorias.length > 0) {
          analito.categorias.forEach(catDetalle => {
            if (catDetalle.categoria) {
              const categoriaNombre = catDetalle.categoria.nombre
              categoriasCount[categoriaNombre] = (categoriasCount[categoriaNombre] || 0) + elementosCount[analito.nombre]
            }
          })
        }
      }
    })

    // Top 10 analitos más solicitados
    // Los elementos son nombres de analitos, buscar por nombre en lugar de ID
    const topAnalitos = Object.entries(elementosCount)
      .map(([nombreElemento, count]) => {
        const analito = analitos.find(a => a.nombre === nombreElemento)
        return {
          analitoId: analito?.id || nombreElemento,
          analitoNombre: analito?.nombre || nombreElemento, // Si no se encuentra, usar el nombre del elemento
          cantidad: count
        }
      })
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)

    // Top 5 categorías más solicitadas
    const topCategorias = Object.entries(categoriasCount)
      .map(([nombre, count]) => ({
        categoriaNombre: nombre,
        cantidad: count
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    // Calcular tiempos promedio
    const comandasCompletadasConTiempo = comandasConDatos.filter(c => 
      c.fechaCompletado && c.fechaCreacion
    )
    
    const tiemposProcesamiento = comandasCompletadasConTiempo.map(c => {
      const inicio = new Date(c.fechaCreacion).getTime()
      const fin = new Date(c.fechaCompletado!).getTime()
      return (fin - inicio) / (1000 * 60 * 60) // Horas
    })

    const tiempoPromedioHoras = tiemposProcesamiento.length > 0
      ? tiemposProcesamiento.reduce((a, b) => a + b, 0) / tiemposProcesamiento.length
      : 0

    // Comandas por día (usando las fechas del filtro o últimos 30 días)
    const fechaInicioQuery = fechaInicio 
      ? new Date(fechaInicio)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const fechaFinQuery = fechaFin
      ? new Date(fechaFin + 'T23:59:59')
      : new Date()

    // Construir where para query raw
    const whereConditions: string[] = [
      `fecha_creacion >= '${fechaInicioQuery.toISOString()}'::timestamp`,
      `fecha_creacion <= '${fechaFinQuery.toISOString()}'::timestamp`,
      `archivada = false`
    ]

    if (sucursalId) {
      whereConditions.push(`sucursal_id = '${sucursalId}'`)
    } else if (user.rol !== 'SUPER_ADMIN' && user.sucursales && Array.isArray(user.sucursales) && user.sucursales.length > 0) {
      const sucursalIds = user.sucursales.map(s => `'${s.id}'`).join(',')
      whereConditions.push(`sucursal_id IN (${sucursalIds})`)
    }

    const whereClause = whereConditions.join(' AND ')

    let comandasPorDia: Array<{ fecha: string; cantidad: number }> = []
    
    try {
      const comandasPorDiaRaw = await prisma.$queryRawUnsafe<Array<{ fecha: Date; cantidad: bigint }>>(`
        SELECT 
          DATE(fecha_creacion) as fecha,
          COUNT(*)::int as cantidad
        FROM comandas
        WHERE ${whereClause}
        GROUP BY DATE(fecha_creacion)
        ORDER BY fecha ASC
      `)

      comandasPorDia = comandasPorDiaRaw.map((item: any) => ({
        fecha: item.fecha ? (item.fecha.toISOString ? item.fecha.toISOString().split('T')[0] : String(item.fecha).split('T')[0]) : '',
        cantidad: Number(item.cantidad || 0)
      }))
    } catch (error: any) {
      console.error('Error al obtener comandas por día:', error)
      // Continuar con array vacío si falla
      comandasPorDia = []
    }

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
          totalUsuarios,
          tiempoPromedioHoras: Math.round(tiempoPromedioHoras * 100) / 100
        },
        porEstado: comandasPorEstadoFormateado,
        porSucursal: comandasPorSucursalFormateado,
        porCategoria: topCategorias,
        topAnalitos: topAnalitos,
        porDia: comandasPorDia
      }
    })

  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error)
    console.error('Stack trace:', error.stack)
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
