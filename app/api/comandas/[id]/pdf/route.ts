import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { generateResultadosPDF, generateComandaPDF } from '@/lib/pdf-generator'

// GET - Generar PDF de resultados o comanda
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
    const { id: comandaId } = params
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'resultados' // 'resultados' o 'comanda'

    // Obtener comanda con toda la información
    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
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
    if (user.rol !== 'SUPER_ADMIN' && !user.sucursales.some(s => s.id === comanda.sucursalId)) {
      return NextResponse.json(
        { success: false, error: 'Sin acceso a esta comanda' },
        { status: 403 }
      )
    }

    // Buscar responsable sanitario
    const responsableSanitario = await prisma.usuario.findFirst({
      where: {
        rol: 'RESPONSABLE_SANITARIO',
        activo: true,
        sucursales: {
          some: {
            sucursalId: comanda.sucursalId,
            activo: true
          }
        }
      },
      select: {
        nombre: true,
        apellido: true
      }
    })

    // Información del laboratorio (esto debería venir de configuración)
    const laboratorioInfo = {
      nombre: 'Laboratorio Clínico',
      direccion: comanda.sucursal.direccion,
      telefono: comanda.sucursal.telefono,
      email: comanda.sucursal.email,
      rfc: 'RFC123456789',
      responsableSanitario: responsableSanitario 
        ? `Dr. ${responsableSanitario.nombre} ${responsableSanitario.apellido}`
        : 'Responsable Sanitario'
    }

    let pdfBuffer: Buffer

    if (tipo === 'resultados') {
      // Generar PDF de resultados
      if (comanda.resultados.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No hay resultados para generar PDF' },
          { status: 400 }
        )
      }

      pdfBuffer = await generateResultadosPDF({
        comanda,
        resultados: comanda.resultados,
        laboratorioInfo
      })
    } else {
      // Generar PDF de comanda
      pdfBuffer = await generateComandaPDF(comanda, laboratorioInfo)
    }

    // Configurar headers para descarga
    const filename = tipo === 'resultados' 
      ? `resultados_${comanda.numeroComanda}.pdf`
      : `comanda_${comanda.numeroComanda}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error: any) {
    console.error('Error al generar PDF:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
