'use client'

import { useEffect, useRef } from 'react'
import { applyThemeColors, getThemeColors } from '@/lib/theme'
import { getAuthToken } from '@/lib/api-helpers'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isLoadingRef = useRef(false)
  const lastLoadTimeRef = useRef(0)

  useEffect(() => {
    // Aplicar colores personalizados al cargar (solo una vez)
    const loadTheme = async () => {
      if (isLoadingRef.current) return
      
      isLoadingRef.current = true
      try {
        // Esperar un momento para asegurar que el token esté guardado
        await new Promise(resolve => setTimeout(resolve, 300))
        
        let userId: string | undefined
        try {
          const token = getAuthToken()
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]))
            userId = payload.userId
          }
        } catch {
          // Sin token, usar defaults
        }
        
        // SIEMPRE cargar desde SQL (fuente de verdad)
        const colors = await getThemeColors(userId)
        // Aplicar colores inmediatamente
        applyThemeColors(colors)
        // Forzar re-aplicación después de un breve delay para asegurar que todos los elementos estén cargados
        setTimeout(() => {
          applyThemeColors(colors)
        }, 200)
        // Una tercera aplicación después de que la página esté completamente cargada
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
              applyThemeColors(colors)
            }, 100)
          })
        }
        lastLoadTimeRef.current = Date.now()
      } catch (error) {
        console.error('[THEME] Error al cargar tema:', error)
      } finally {
        isLoadingRef.current = false
      }
    }
    
    loadTheme()
  }, [])

  // Escuchar cambios en el storage para actualizar colores cuando cambie el usuario
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null

    const handleStorageChange = async () => {
      // Evitar llamadas muy frecuentes (debounce de 500ms)
      const now = Date.now()
      if (now - lastLoadTimeRef.current < 500) {
        return
      }

      if (isLoadingRef.current) {
        return
      }

      // Debounce adicional
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(async () => {
        isLoadingRef.current = true
        try {
          let userId: string | undefined
          try {
            const token = getAuthToken()
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]))
              userId = payload.userId
            }
          } catch {
            // Sin token, usar defaults
          }
          
          // SIEMPRE cargar desde SQL (fuente de verdad)
          const colors = await getThemeColors(userId)
          applyThemeColors(colors)
          lastLoadTimeRef.current = Date.now()
        } catch (error) {
          console.error('[THEME] Error al recargar tema:', error)
        } finally {
          isLoadingRef.current = false
        }
      }, 500)
    }

    // Escuchar cambios en localStorage (solo de otros tabs)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [])

  return <>{children}</>
}

