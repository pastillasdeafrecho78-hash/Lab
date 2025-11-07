import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { registrarAuditoria, getAccionAuditoria, sanitizeDataForAudit } from '@/lib/auditoria'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const result = await authenticateUser(email, password)

    // Registrar auditoría de login (no bloquear si falla)
    try {
      await registrarAuditoria({
        usuarioId: result.user.id,
        accion: getAccionAuditoria('LOGIN', 'usuario'),
        tabla: 'usuarios',
        ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        dispositivo: 'web'
      })
    } catch (auditError) {
      // Error no crítico, no interrumpir el login
    }

    const response = NextResponse.json({
      success: true,
      data: result.user,
      token: result.token,
      message: 'Inicio de sesión exitoso'
    })

    // Establecer cookie con el token para el middleware
    response.cookies.set('token', result.token, {
      httpOnly: false, // Permitir acceso desde JavaScript también
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/', // Asegurar que la cookie esté disponible en toda la aplicación
      domain: undefined // No especificar dominio para que funcione en localhost
    })

    return response

  } catch (error: any) {
    console.error('Error en login:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 401 }
    )
  }
}
