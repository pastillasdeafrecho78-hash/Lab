/**
 * Obtiene el token de autenticación desde múltiples fuentes
 * para compatibilidad con diferentes navegadores (incluyendo Cursor)
 */
export function getAuthToken(): string | null {
  // Intentar obtener de localStorage primero
  try {
    const token = localStorage.getItem('token')
    if (token) return token
  } catch (e) {
    console.warn('[AUTH] Error al leer localStorage:', e)
  }

  // Si no está en localStorage, intentar sessionStorage
  try {
    const token = sessionStorage.getItem('token')
    if (token) return token
  } catch (e) {
    console.warn('[AUTH] Error al leer sessionStorage:', e)
  }

  // Intentar obtener de cookies como último recurso
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'token' && value) {
        return value
      }
    }
  }

  return null
}

/**
 * Guarda el token en múltiples almacenamientos para máxima compatibilidad
 */
export function saveAuthToken(token: string): void {
  // Guardar en localStorage
  try {
    localStorage.setItem('token', token)
  } catch (e) {
    console.warn('[AUTH] Error al guardar en localStorage:', e)
  }

  // También guardar en sessionStorage como respaldo
  try {
    sessionStorage.setItem('token', token)
  } catch (e) {
    console.warn('[AUTH] Error al guardar en sessionStorage:', e)
  }
}

/**
 * Elimina el token de todos los almacenamientos
 */
export function removeAuthToken(): void {
  try {
    localStorage.removeItem('token')
  } catch (e) {
    console.warn('[AUTH] Error al eliminar de localStorage:', e)
  }

  try {
    sessionStorage.removeItem('token')
  } catch (e) {
    console.warn('[AUTH] Error al eliminar de sessionStorage:', e)
  }
}

/**
 * Crea headers de autenticación para peticiones fetch
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

