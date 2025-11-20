import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/', '/login', '/api/auth/login']
  const isPublicRoute = publicRoutes.some(route => pathname === route)

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Obtener token de cookie, header o query parameter (para compatibilidad con Cursor)
  const cookieToken = request.cookies.get('token')?.value
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '')
  const queryToken = request.nextUrl.searchParams.get('token')
  const token = cookieToken || headerToken || queryToken

  // Verificar token para rutas protegidas
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    const payload = await verifyTokenEdge(token)
    if (!payload) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Agregar información del usuario a los headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-rol', payload.rol)
    requestHeaders.set('x-user-sucursales', JSON.stringify(payload.sucursales))

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    console.error(`[Middleware] Error al verificar token:`, error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
