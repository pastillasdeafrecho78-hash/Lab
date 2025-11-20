'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PaintBrushIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { getAuthHeaders } from '@/lib/api-helpers'
import { getThemeColors, saveThemeColors, resetThemeColors, applyThemeColors, ThemeColors, availableFonts } from '@/lib/theme'
import { themePresets, getPresetById, ThemePreset } from '@/lib/theme-presets'

interface Usuario {
  id: string
  nombre: string
  apellido: string
  rol: string
}

export default function PersonalizacionPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [colors, setColors] = useState<ThemeColors>({
    primaryBase: '#2563eb',
    grayBase: '#64748b',
    secondaryBase: '#64748b',
    successBase: '#16a34a',
    warningBase: '#d97706',
    dangerBase: '#dc2626',
    fontFamily: 'Inter',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#64748b',
    textOnColor: '#ffffff',
    textOnColorSecondary: '#ffffff'
  })
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number; direction: 'up' | 'down' } | null>(null)
  const router = useRouter()

  // Función para calcular la posición óptima del popover
  const calculatePopoverPosition = (elementRect: DOMRect, popoverHeight: number = 400): { x: number; y: number; direction: 'up' | 'down' } => {
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const spaceBelow = viewportHeight - elementRect.bottom
    const spaceAbove = elementRect.top
    const elementCenterX = elementRect.left + elementRect.width / 2
    
    // Estimar altura del popover (ajustar según contenido)
    const estimatedPopoverHeight = popoverHeight
    const padding = 20 // Espacio de padding desde el elemento
    
    let y: number
    let direction: 'up' | 'down'
    
    // Si hay suficiente espacio abajo, mostrar abajo
    if (spaceBelow >= estimatedPopoverHeight + padding) {
      y = elementRect.bottom + padding
      direction = 'down'
    } 
    // Si no hay suficiente espacio abajo pero sí arriba, mostrar arriba
    else if (spaceAbove >= estimatedPopoverHeight + padding) {
      y = elementRect.top - padding
      direction = 'up'
    }
    // Si no hay suficiente espacio en ninguna dirección, elegir la que tenga más espacio
    else {
      if (spaceBelow > spaceAbove) {
        y = elementRect.bottom + padding
        direction = 'down'
      } else {
        y = elementRect.top - padding
        direction = 'up'
      }
    }
    
    // Asegurar que el popover no se salga de los bordes horizontales
    const popoverWidth = 280 // min-w-[280px]
    let x = elementCenterX
    if (x - popoverWidth / 2 < 10) {
      x = popoverWidth / 2 + 10
    } else if (x + popoverWidth / 2 > viewportWidth - 10) {
      x = viewportWidth - popoverWidth / 2 - 10
    }
    
    return { x, y, direction }
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const headers = getAuthHeaders()
      const response = await fetch('/api/auth/me', { headers })
      const data = await response.json()

      if (data.success) {
        setUsuario(data.data)
        // Cargar colores guardados del usuario actual
        const userColors = await getThemeColors(data.data.id)
        // Asegurar que todos los campos estén presentes (merge con defaults)
        setColors({
          primaryBase: userColors.primaryBase || '#2563eb',
          grayBase: userColors.grayBase || '#64748b',
          secondaryBase: userColors.secondaryBase || '#64748b',
          successBase: userColors.successBase || '#16a34a',
          warningBase: userColors.warningBase || '#d97706',
          dangerBase: userColors.dangerBase || '#dc2626',
          fontFamily: userColors.fontFamily || 'Inter',
          textPrimary: userColors.textPrimary || '#0f172a',
          textSecondary: userColors.textSecondary || '#475569',
          textTertiary: userColors.textTertiary || '#64748b',
          textOnColor: userColors.textOnColor || '#ffffff',
          textOnColorSecondary: userColors.textOnColorSecondary || '#ffffff'
        })
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleColorChange = async (colorKey: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [colorKey]: value }
    setColors(newColors)
    // Aplicar inmediatamente para preview
    applyThemeColors(newColors)
    // Guardar automáticamente cuando se cambia un color
    if (usuario) {
      await saveThemeColors(newColors, usuario.id)
    }
  }

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeColorPicker && !(e.target as Element).closest('.fixed.z-50')) {
        setActiveColorPicker(null)
        setPopoverPosition(null)
      }
    }

    if (activeColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeColorPicker])

  const handleSave = async () => {
    if (usuario) {
      await saveThemeColors(colors, usuario.id)
      toast.success('Colores guardados exitosamente')
    }
  }

  const handleReset = async () => {
    if (confirm('¿Estás seguro de que quieres restaurar los colores por defecto?')) {
      if (usuario) {
        await resetThemeColors(usuario.id)
        const userColors = await getThemeColors(usuario.id)
        // Asegurar que todos los campos estén presentes (merge con defaults)
        setColors({
          primaryBase: userColors.primaryBase || '#2563eb',
          grayBase: userColors.grayBase || '#64748b',
          secondaryBase: userColors.secondaryBase || '#64748b',
          successBase: userColors.successBase || '#16a34a',
          warningBase: userColors.warningBase || '#d97706',
          dangerBase: userColors.dangerBase || '#dc2626',
          fontFamily: userColors.fontFamily || 'Inter',
          textPrimary: userColors.textPrimary || '#0f172a',
          textSecondary: userColors.textSecondary || '#475569',
          textTertiary: userColors.textTertiary || '#64748b',
          textOnColor: userColors.textOnColor || '#ffffff',
          textOnColorSecondary: userColors.textOnColorSecondary || '#ffffff'
        })
        toast.success('Colores restaurados')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!usuario) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-100 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 rounded-lg bg-gray-200 text-secondary hover:bg-gray-300"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <PaintBrushIcon className="h-6 w-6 text-primary-600 mr-2" />
                <h1 className="text-xl font-semibold text-primary">Personalización</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <div className="card-header">
            <h2 className="text-2xl font-bold text-primary">Personalización</h2>
          </div>

          <div className="space-y-8">
            {/* Perfiles Preestablecidos - Arcoíris */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2">Colores del Arcoíris</h3>
              <p className="text-sm text-secondary mb-4">
                Perfiles claros basados en los colores del arcoíris
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {themePresets.filter(p => p.id.startsWith('rainbow-')).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={async () => {
                      if (usuario) {
                        // Asegurar que todos los campos estén presentes
                        const presetColors: ThemeColors = {
                          ...preset.colors,
                          textOnColorSecondary: preset.colors.textOnColorSecondary || '#ffffff'
                        }
                        setColors(presetColors)
                        applyThemeColors(presetColors)
                        await saveThemeColors(presetColors, usuario.id)
                        toast.success(`Perfil "${preset.name}" aplicado`)
                      }
                    }}
                    className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300 hover:border-primary-500 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-primary">{preset.name}</span>
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: preset.colors.primaryBase }}
                        title="Color primario"
                      />
                    </div>
                    <p className="text-xs text-secondary">{preset.description}</p>
                    <div className="mt-2 h-2 rounded" style={{ backgroundColor: preset.colors.primaryBase }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Perfiles Preestablecidos - Modo Oscuro */}
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2">Modo Oscuro</h3>
              <p className="text-sm text-secondary mb-4">
                Temas oscuros con acentos de colores del arcoíris
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {themePresets.filter(p => p.id.startsWith('dark-')).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={async () => {
                      if (usuario) {
                        // Asegurar que todos los campos estén presentes
                        const presetColors: ThemeColors = {
                          ...preset.colors,
                          textOnColorSecondary: preset.colors.textOnColorSecondary || '#ffffff'
                        }
                        setColors(presetColors)
                        applyThemeColors(presetColors)
                        await saveThemeColors(presetColors, usuario.id)
                        toast.success(`Perfil "${preset.name}" aplicado`)
                      }
                    }}
                    className="p-4 bg-gray-800 rounded-lg border-2 border-gray-700 hover:border-primary-500 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-on-color">{preset.name}</span>
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-600"
                        style={{ backgroundColor: preset.colors.primaryBase }}
                        title="Color primario"
                      />
                    </div>
                    <p className="text-xs text-tertiary">{preset.description}</p>
                    <div className="mt-2 h-2 rounded" style={{ backgroundColor: preset.colors.primaryBase }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Preview - Sección principal */}
            <div className="p-6 bg-gray-300 rounded-lg relative">
              <h3 className="text-lg font-semibold text-primary mb-4">Vista Previa</h3>
              <div className="space-y-6">
                {/* Botones */}
                <div>
                  <p className="text-sm font-medium text-secondary mb-3">Botones</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <button 
                      className="btn btn-primary cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('primaryBase')
                      }}
                      title="Click para editar color primario"
                      style={{ color: colors.textOnColor || '#ffffff' }}
                    >
                      Botón Primario
                    </button>
                    <button 
                      className="btn btn-success cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('successBase')
                      }}
                      title="Click para editar color de éxito"
                      style={{ color: colors.textOnColor || '#ffffff' }}
                    >
                      Botón Éxito
                    </button>
                    <button 
                      className="btn btn-warning cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('warningBase')
                      }}
                      title="Click para editar color de advertencia"
                      style={{ color: colors.textOnColor || '#ffffff' }}
                    >
                      Botón Advertencia
                    </button>
                    <button 
                      className="btn btn-danger cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('dangerBase')
                      }}
                      title="Click para editar color de peligro"
                      style={{ color: colors.textOnColor || '#ffffff' }}
                    >
                      Botón Peligro
                    </button>
                    <button 
                      className="btn btn-secondary cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('secondaryBase')
                      }}
                      title="Click para editar color secundario"
                      style={{ color: colors.textOnColorSecondary || '#ffffff' }}
                    >
                      Botón Secundario
                    </button>
                  </div>
                </div>

                {/* Colores de Texto - Sección dedicada */}
                <div>
                  <p className="text-sm font-medium text-secondary mb-3">Colores de Texto</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300 hover:border-primary-500 transition-colors text-left"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('textPrimary')
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-primary">Texto Principal</span>
                        <div 
                          className="w-8 h-8 rounded border-2 border-gray-300"
                          style={{ backgroundColor: colors.textPrimary || '#0f172a' }}
                        />
                      </div>
                      <p className="text-xs text-secondary">Color para textos principales sobre fondos</p>
                    </button>
                    
                    <button
                      className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300 hover:border-primary-500 transition-colors text-left"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('textSecondary')
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-primary">Texto Secundario</span>
                        <div 
                          className="w-8 h-8 rounded border-2 border-gray-300"
                          style={{ backgroundColor: colors.textSecondary || '#475569' }}
                        />
                      </div>
                      <p className="text-xs text-secondary">Color para textos secundarios sobre fondos</p>
                    </button>
                    
                    <button
                      className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300 hover:border-primary-500 transition-colors text-left"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('textTertiary')
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-primary">Texto Terciario</span>
                        <div 
                          className="w-8 h-8 rounded border-2 border-gray-300"
                          style={{ backgroundColor: colors.textTertiary || '#64748b' }}
                        />
                      </div>
                      <p className="text-xs text-secondary">Color para textos terciarios sobre fondos</p>
                    </button>
                    
                    <button
                      className="p-4 bg-primary-600 rounded-lg border-2 border-primary-700 hover:border-primary-400 transition-colors text-left"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('textOnColor')
                      }}
                      style={{ color: colors.textOnColor || '#ffffff' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold" style={{ color: colors.textOnColor || '#ffffff' }}>
                          Texto sobre Botones Primarios
                        </span>
                        <div className="flex gap-2">
                          <div 
                            className="w-8 h-8 rounded border-2 border-white/50 cursor-pointer"
                            style={{ backgroundColor: colors.textOnColor || '#ffffff' }}
                            title="Color sobre botón primario - Click para editar"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const rect = e.currentTarget.getBoundingClientRect()
                              setPopoverPosition(calculatePopoverPosition(rect))
                              setActiveColorPicker('textOnColor')
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs opacity-90 mb-2" style={{ color: colors.textOnColor || '#ffffff' }}>
                        Color para texto sobre botones primarios, éxito, advertencia y peligro
                      </p>
                      <button
                        type="button"
                        className="px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                        style={{ 
                          backgroundColor: `rgb(var(--color-primary-600))`,
                          color: colors.textOnColor || '#ffffff'
                        }}
                        onClick={async (e) => {
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setPopoverPosition(calculatePopoverPosition(rect))
                          setActiveColorPicker('textOnColor')
                        }}
                      >
                        Botón Primario
                      </button>
                    </button>
                    
                    <button
                      className="p-4 bg-secondary-600 rounded-lg border-2 border-secondary-700 hover:border-secondary-400 transition-colors text-left"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('textOnColorSecondary')
                      }}
                      style={{ 
                        backgroundColor: `rgb(var(--color-secondary-600))`,
                        color: colors.textOnColorSecondary || '#ffffff'
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold" style={{ color: colors.textOnColorSecondary || '#ffffff' }}>
                          Texto sobre Botón Secundario
                        </span>
                        <div className="flex gap-2">
                          <div 
                            className="w-8 h-8 rounded border-2 border-white/50 cursor-pointer"
                            style={{ backgroundColor: colors.textOnColorSecondary || '#ffffff' }}
                            title="Color sobre botón secundario - Click para editar"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const rect = e.currentTarget.getBoundingClientRect()
                              setPopoverPosition(calculatePopoverPosition(rect))
                              setActiveColorPicker('textOnColorSecondary')
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs opacity-90 mb-2" style={{ color: colors.textOnColorSecondary || '#ffffff' }}>
                        Color para texto sobre botones secundarios
                      </p>
                      <button
                        type="button"
                        className="px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                        style={{ 
                          backgroundColor: `rgb(var(--color-secondary-600))`,
                          color: colors.textOnColorSecondary || '#ffffff'
                        }}
                        onClick={async (e) => {
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setPopoverPosition(calculatePopoverPosition(rect))
                          setActiveColorPicker('textOnColorSecondary')
                        }}
                      >
                        Botón Secundario
                      </button>
                    </button>
                  </div>
                </div>

                {/* Escalas de grises para fondos */}
                <div>
                  <p className="text-sm font-medium text-secondary mb-3">Escalas de Grises (Click para editar)</p>
                  <div className="space-y-3">
                    {/* Fondo de página */}
                    <div 
                      className="p-4 bg-gray-100 rounded border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('grayBase')
                      }}
                      title="Click para editar escala de grises"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">Fondo de página (gray-50)</span>
                        <div className="flex gap-1">
                          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                            <div
                              key={shade}
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: `rgb(var(--color-gray-${shade}))` }}
                              title={`gray-${shade}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p 
                          className="text-xs cursor-pointer text-primary" 
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = e.currentTarget.getBoundingClientRect()
                            setPopoverPosition(calculatePopoverPosition(rect))
                            setActiveColorPicker('textPrimary')
                          }}
                          title="Click para editar color de texto principal"
                        >
                          Texto principal
                        </p>
                        <p 
                          className="text-xs cursor-pointer text-secondary" 
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = e.currentTarget.getBoundingClientRect()
                            setPopoverPosition(calculatePopoverPosition(rect))
                            setActiveColorPicker('textSecondary')
                          }}
                          title="Click para editar color de texto secundario"
                        >
                          Texto secundario
                        </p>
                        <p 
                          className="text-xs cursor-pointer text-tertiary" 
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = e.currentTarget.getBoundingClientRect()
                            setPopoverPosition(calculatePopoverPosition(rect))
                            setActiveColorPicker('textTertiary')
                          }}
                          title="Click para editar color de texto terciario"
                        >
                          Texto terciario
                        </p>
                      </div>
                    </div>

                    {/* Header */}
                    <div 
                      className="p-4 bg-gray-200 rounded border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('grayBase')
                      }}
                      title="Click para editar escala de grises"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">Header (gray-100)</span>
                        <div className="flex gap-1">
                          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                            <div
                              key={shade}
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: `rgb(var(--color-gray-${shade}))` }}
                              title={`gray-${shade}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p 
                        className="text-xs font-medium text-primary" 
                        onClick={(e) => {
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setPopoverPosition(calculatePopoverPosition(rect))
                          setActiveColorPicker('textPrimary')
                        }}
                        title="Click para editar color de texto principal"
                      >
                        Título del Header
                      </p>
                    </div>

                    {/* Card */}
                    <div 
                      className="p-4 bg-gray-200 rounded border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setPopoverPosition(calculatePopoverPosition(rect))
                        setActiveColorPicker('grayBase')
                      }}
                      title="Click para editar escala de grises"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">Card (gray-100)</span>
                        <div className="flex gap-1">
                          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                            <div
                              key={shade}
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: `rgb(var(--color-gray-${shade}))` }}
                              title={`gray-${shade}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p 
                        className="text-xs text-primary" 
                        onClick={(e) => {
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setPopoverPosition(calculatePopoverPosition(rect))
                          setActiveColorPicker('textPrimary')
                        }}
                        title="Click para editar color de texto principal"
                      >
                        Contenido de la card
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tipografía */}
                <div>
                  <p className="text-sm font-medium text-secondary mb-3">Tipografía</p>
                  <div 
                    className="p-4 bg-gray-100 rounded border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setPopoverPosition(calculatePopoverPosition(rect, 500))
                      setActiveColorPicker('fontFamily')
                    }}
                    title="Click para editar tipografía"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-primary block mb-1">Fuente actual</span>
                        <span className="text-lg text-primary" style={{ fontFamily: colors.fontFamily || 'Inter' }}>
                          {colors.fontFamily || 'Inter'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-tertiary mb-1">Ejemplo de texto</p>
                        <p className="text-sm text-secondary" style={{ fontFamily: colors.fontFamily || 'Inter' }}>
                          The quick brown fox jumps over the lazy dog
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Popover de selector de color/tipografía */}
              {activeColorPicker && popoverPosition && (
                <div 
                  className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[280px]"
                  style={{
                    left: `${popoverPosition.x}px`,
                    ...(popoverPosition.direction === 'up' 
                      ? { bottom: `${window.innerHeight - popoverPosition.y}px` }
                      : { top: `${popoverPosition.y}px` }
                    ),
                    transform: 'translateX(-50%)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-primary">
                      {activeColorPicker === 'primaryBase' && 'Color Primario'}
                      {activeColorPicker === 'secondaryBase' && 'Botón Secundario'}
                      {activeColorPicker === 'successBase' && 'Botón Éxito'}
                      {activeColorPicker === 'warningBase' && 'Botón Advertencia'}
                      {activeColorPicker === 'dangerBase' && 'Botón Peligro'}
                      {activeColorPicker === 'grayBase' && 'Escala de Grises'}
                      {activeColorPicker === 'fontFamily' && 'Tipografía'}
                      {activeColorPicker === 'textPrimary' && 'Color de Texto Principal (sobre fondos)'}
                      {activeColorPicker === 'textSecondary' && 'Color de Texto Secundario (sobre fondos)'}
                      {activeColorPicker === 'textTertiary' && 'Color de Texto Terciario (sobre fondos)'}
                      {activeColorPicker === 'textOnColor' && 'Color de Texto sobre Botones Primarios'}
                      {activeColorPicker === 'textOnColorSecondary' && 'Color de Texto sobre Botón Secundario'}
                    </h4>
                    <button
                      onClick={() => {
                        setActiveColorPicker(null)
                        setPopoverPosition(null)
                      }}
                      className="text-tertiary hover:text-secondary"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {activeColorPicker === 'fontFamily' ? (
                      /* Selector de tipografía */
                      <div className="space-y-3">
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {availableFonts.map((font) => (
                            <div
                              key={font.value}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                colors.fontFamily === font.value
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleColorChange('fontFamily', font.value)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-primary" style={{ fontFamily: font.value }}>
                                  {font.label}
                                </span>
                                {colors.fontFamily === font.value && (
                                  <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <p className="text-sm text-secondary mt-1" style={{ fontFamily: font.value }}>
                                The quick brown fox jumps over the lazy dog
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : activeColorPicker === 'textPrimary' || activeColorPicker === 'textSecondary' || activeColorPicker === 'textTertiary' || activeColorPicker === 'textOnColor' || activeColorPicker === 'textOnColorSecondary' ? (
                      /* Selector de color de texto */
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={colors[activeColorPicker as keyof ThemeColors] as string}
                            onChange={(e) => handleColorChange(activeColorPicker as keyof ThemeColors, e.target.value)}
                            className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                          />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={colors[activeColorPicker as keyof ThemeColors] as string}
                              onChange={(e) => handleColorChange(activeColorPicker as keyof ThemeColors, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-primary"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                        <div 
                          className="p-4 rounded-lg border border-gray-200" 
                          style={{ 
                            backgroundColor: activeColorPicker === 'textOnColor' 
                              ? 'rgb(var(--color-primary-600))' 
                              : activeColorPicker === 'textOnColorSecondary'
                              ? 'rgb(var(--color-secondary-600))'
                              : 'rgb(var(--color-gray-50))' 
                          }}
                        >
                          <p 
                            className="text-sm mb-2" 
                            style={{ color: colors[activeColorPicker as keyof ThemeColors] as string }}
                          >
                            Ejemplo de texto con este color
                          </p>
                          <p 
                            className="text-xs" 
                            style={{ 
                              color: activeColorPicker === 'textOnColor' || activeColorPicker === 'textOnColorSecondary' 
                                ? colors[activeColorPicker as keyof ThemeColors] as string 
                                : undefined 
                            }}
                          >
                            {activeColorPicker === 'textOnColor' 
                              ? 'Este color se aplicará al texto sobre botones primarios, éxito, advertencia y peligro en toda la aplicación'
                              : activeColorPicker === 'textOnColorSecondary'
                              ? 'Este color se aplicará al texto sobre botones secundarios en toda la aplicación'
                              : `Este color se aplicará a todos los textos ${activeColorPicker === 'textPrimary' ? 'principales' : activeColorPicker === 'textSecondary' ? 'secundarios' : 'terciarios'} sobre fondos de la aplicación`
                            }
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={colors[activeColorPicker as keyof ThemeColors] as string}
                            onChange={(e) => handleColorChange(activeColorPicker as keyof ThemeColors, e.target.value)}
                            className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                          />
                          <div className="flex-1">
                            <input
                              type="text"
                              value={colors[activeColorPicker as keyof ThemeColors] as string}
                              onChange={(e) => handleColorChange(activeColorPicker as keyof ThemeColors, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-primary"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                        
                        {/* Vista previa mini de la escala */}
                        <div>
                          <p className="text-xs text-tertiary mb-2">Vista previa de la escala:</p>
                          <div className="grid grid-cols-10 gap-1">
                            {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => {
                              let colorName = 'gray'
                              if (activeColorPicker === 'primaryBase') colorName = 'primary'
                              else if (activeColorPicker === 'secondaryBase') colorName = 'secondary'
                              else if (activeColorPicker === 'successBase') colorName = 'success'
                              else if (activeColorPicker === 'warningBase') colorName = 'warning'
                              else if (activeColorPicker === 'dangerBase') colorName = 'danger'
                              else if (activeColorPicker === 'grayBase') colorName = 'gray'
                              
                              return (
                                <div
                                  key={shade}
                                  className="h-8 rounded border border-gray-300"
                                  style={{ 
                                    backgroundColor: `rgb(var(--color-${colorName}-${shade}))` 
                                  }}
                                  title={`${shade}`}
                                />
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="btn btn-secondary"
              >
                Restaurar Valores por Defecto
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
