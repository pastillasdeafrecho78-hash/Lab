import { prisma } from './prisma'

/**
 * Asigna automáticamente una sucursal a una comanda basándose en:
 * 1. Dirección del cliente (si está disponible)
 * 2. Carga de trabajo de las sucursales
 * 3. Disponibilidad de sucursales
 */
export async function asignarSucursalAutomatica(
  clienteId: string,
  sucursalesDisponibles?: string[]
): Promise<string | null> {
  try {
    // Obtener cliente con su dirección
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        direccion: true
      }
    })

    // Obtener todas las sucursales activas
    const whereSucursales: any = { activa: true }
    if (sucursalesDisponibles && sucursalesDisponibles.length > 0) {
      whereSucursales.id = { in: sucursalesDisponibles }
    }

    const sucursales = await prisma.sucursal.findMany({
      where: whereSucursales,
      include: {
        _count: {
          select: {
            comandas: {
              where: {
                estado: {
                  in: ['PENDIENTE', 'EN_PROCESO']
                }
              }
            }
          }
        }
      }
    })

    if (sucursales.length === 0) {
      return null
    }

    // Si el cliente tiene dirección, intentar encontrar la sucursal más cercana
    if (cliente?.direccion) {
      const direccionCliente = cliente.direccion.toLowerCase()
      
      // Buscar coincidencias en nombres de ciudades/áreas comunes
      const ciudadesComunes = [
        'centro', 'norte', 'sur', 'este', 'oeste',
        'downtown', 'zona', 'colonia', 'fraccionamiento'
      ]

      // Intentar encontrar sucursal por coincidencia de palabras clave
      for (const ciudad of ciudadesComunes) {
        const sucursalCoincidente = sucursales.find(s => {
          const direccionSucursal = s.direccion.toLowerCase()
          return direccionSucursal.includes(ciudad) && direccionCliente.includes(ciudad)
        })

        if (sucursalCoincidente) {
          return sucursalCoincidente.id
        }
      }

      // Si no hay coincidencia, buscar por palabras comunes en la dirección
      const palabrasCliente = direccionCliente.split(/\s+/)
      for (const palabra of palabrasCliente) {
        if (palabra.length > 4) { // Solo palabras significativas
          const sucursalCoincidente = sucursales.find(s => {
            return s.direccion.toLowerCase().includes(palabra)
          })

          if (sucursalCoincidente) {
            return sucursalCoincidente.id
          }
        }
      }
    }

    // Si no se encontró por dirección, asignar a la sucursal con menos carga
    const sucursalMenosCargada = sucursales.reduce((prev, current) => {
      return prev._count.comandas < current._count.comandas ? prev : current
    })

    return sucursalMenosCargada.id

  } catch (error) {
    console.error('Error al asignar sucursal automática:', error)
    return null
  }
}

/**
 * Obtiene la sucursal recomendada para un cliente
 */
export async function obtenerSucursalRecomendada(
  clienteId: string,
  sucursalesDisponibles?: string[]
): Promise<{ sucursalId: string; razon: string } | null> {
  try {
    const sucursalId = await asignarSucursalAutomatica(clienteId, sucursalesDisponibles)
    
    if (!sucursalId) {
      return null
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { direccion: true }
    })

    const sucursal = await prisma.sucursal.findUnique({
      where: { id: sucursalId },
      select: { nombre: true, direccion: true }
    })

    let razon = 'Asignada automáticamente'
    if (cliente?.direccion && sucursal?.direccion) {
      const direccionCliente = cliente.direccion.toLowerCase()
      const direccionSucursal = sucursal.direccion.toLowerCase()
      
      // Verificar si hay coincidencias
      const palabrasComunes = direccionCliente.split(/\s+/).filter(p => 
        p.length > 4 && direccionSucursal.includes(p.toLowerCase())
      )
      
      if (palabrasComunes.length > 0) {
        razon = `Cercana a la dirección del cliente`
      } else {
        razon = `Menor carga de trabajo`
      }
    } else {
      razon = `Menor carga de trabajo`
    }

    return {
      sucursalId,
      razon
    }
  } catch (error) {
    console.error('Error al obtener sucursal recomendada:', error)
    return null
  }
}

