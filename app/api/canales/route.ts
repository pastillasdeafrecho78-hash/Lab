import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'
import { z } from 'zod'

const canalSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  descripcion: z.string().max(500, 'Descripción muy larga').optional(),
  categoria: z.enum(['GENERAL', 'SUCURSAL', 'EQUIPO']),
  tipo: z.enum(['TEXTO', 'VOZ']).default('TEXTO'),
  sucursalId: z.string().optional(),
  equipoId: z.string().optional(),
  orden: z.number().int().default(0)
})

// GET - Obtener canales
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')
    const sucursalId = searchParams.get('sucursalId')
    const equipoId = searchParams.get('equipoId')

    const where: any = {
      activo: true
    }

    if (categoria) {
      where.categoria = categoria
    }

    if (sucursalId) {
      where.sucursalId = sucursalId
    }

    if (equipoId) {
      where.equipoId = equipoId
    }

    // Filtrar por permisos del usuario
    if (user.rol !== 'SUPER_ADMIN') {
      // Solo mostrar canales donde el usuario tiene permiso de ver
      const canalesConPermiso = await prisma.canalPermiso.findMany({
        where: {
          rol: user.rol,
          puedeVer: true
        },
        select: {
          canalId: true
        }
      })

      const canalIds = canalesConPermiso.map(cp => cp.canalId)
      
      // También incluir canales generales y canales de sus sucursales
      where.OR = [
        { id: { in: canalIds } },
        { categoria: 'GENERAL' },
        {
          categoria: 'SUCURSAL',
          sucursalId: { in: user.sucursales.map(s => s.id) }
        }
      ]
    }

    const canales = await prisma.canal.findMany({
      where,
      include: {
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        sucursal: {
          select: {
            id: true,
            nombre: true
          }
        },
        equipo: {
          select: {
            id: true,
            nombre: true
          }
        },
        _count: {
          select: {
            mensajes: true
          }
        }
      },
      orderBy: [
        { categoria: 'asc' },
        { orden: 'asc' },
        { nombre: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: canales
    })

  } catch (error: any) {
    console.error('Error al obtener canales:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear canal
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear canales' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = canalSchema.parse(body)

    // Validar que si es SUCURSAL, tenga sucursalId
    if (validatedData.categoria === 'SUCURSAL' && !validatedData.sucursalId) {
      return NextResponse.json(
        { success: false, error: 'Sucursal es requerida para canales de sucursal' },
        { status: 400 }
      )
    }

    // Validar que si es EQUIPO, tenga equipoId
    if (validatedData.categoria === 'EQUIPO' && !validatedData.equipoId) {
      return NextResponse.json(
        { success: false, error: 'Equipo es requerido para canales de equipo' },
        { status: 400 }
      )
    }

    // Verificar acceso a la sucursal/equipo si no es super admin
    if (user.rol !== 'SUPER_ADMIN') {
      if (validatedData.sucursalId && !user.sucursales.some(s => s.id === validatedData.sucursalId)) {
        return NextResponse.json(
          { success: false, error: 'Sin acceso a esta sucursal' },
          { status: 403 }
        )
      }
    }

    // Crear canal
    const canal = await prisma.canal.create({
      data: {
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        categoria: validatedData.categoria,
        tipo: validatedData.tipo,
        sucursalId: validatedData.sucursalId,
        equipoId: validatedData.equipoId,
        orden: validatedData.orden,
        creadoPorId: user.id
      },
      include: {
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        sucursal: {
          select: {
            id: true,
            nombre: true
          }
        },
        equipo: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // Crear permisos por defecto
    const roles = ['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION']
    const permisosDefault = roles.map(rol => ({
      canalId: canal.id,
      rol: rol as any,
      puedeVer: true,
      puedeEscribir: true,
      puedeAdministrar: rol === 'SUPER_ADMIN' || rol === 'RESPONSABLE_SANITARIO'
    }))

    await prisma.canalPermiso.createMany({
      data: permisosDefault
    })

    // Registrar auditoría
    await registrarAuditoria({
      usuarioId: user.id,
      accion: getAccionAuditoria('CREATE', 'canal'),
      tabla: 'canales',
      registroId: canal.id,
      datosNuevos: sanitizeDataForAudit(canal),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      dispositivo: 'web'
    })

    return NextResponse.json({
      success: true,
      data: canal,
      message: 'Canal creado exitosamente'
    })

  } catch (error: any) {
    console.error('Error al crear canal:', error)
    
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

