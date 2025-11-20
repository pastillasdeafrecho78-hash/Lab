'use client'

import { useEffect } from 'react'
import { applyThemeColors, getThemeColors, availableFonts } from '@/lib/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Aplicar colores personalizados al cargar
    // getThemeColors() intentará obtener el userId del token automáticamente
    const colors = getThemeColors()
    applyThemeColors(colors)
  }, [])

  // Escuchar cambios en el storage para actualizar colores cuando cambie el usuario
  useEffect(() => {
    const handleStorageChange = () => {
      const colors = getThemeColors()
      applyThemeColors(colors)
    }

    // Escuchar cambios en localStorage (cuando se guarda token o configuración)
    window.addEventListener('storage', handleStorageChange)
    
    // También escuchar cambios en el mismo tab (cuando se guarda configuración)
    const originalSetItem = localStorage.setItem
    localStorage.setItem = function(...args) {
      originalSetItem.apply(this, args)
      if (args[0]?.startsWith('theme-colors') || args[0] === 'token') {
        handleStorageChange()
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      localStorage.setItem = originalSetItem
    }
  }, [])

  return <>{children}</>
}

