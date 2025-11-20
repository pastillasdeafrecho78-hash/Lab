// Perfiles preestablecidos de temas estéticos
import { ThemeColors } from './theme'

export interface ThemePreset {
  id: string
  name: string
  description: string
  colors: ThemeColors
}

export const themePresets: ThemePreset[] = [
  // ARCOÍRIS - Modo Claro
  {
    id: 'rainbow-red',
    name: 'Rojo',
    description: 'Rojo vibrante y energético',
    colors: {
      primaryBase: '#dc2626',
      grayBase: '#64748b',
      secondaryBase: '#b91c1c',
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#dc2626',
      fontFamily: 'Inter',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'rainbow-orange',
    name: 'Naranja',
    description: 'Naranja cálido y acogedor',
    colors: {
      primaryBase: '#ea580c',
      grayBase: '#64748b',
      secondaryBase: '#c2410c',
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#dc2626',
      fontFamily: 'Inter',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'rainbow-yellow',
    name: 'Amarillo',
    description: 'Amarillo brillante y optimista',
    colors: {
      primaryBase: '#ca8a04',
      grayBase: '#64748b',
      secondaryBase: '#a16207',
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#dc2626',
      fontFamily: 'Inter',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'rainbow-green',
    name: 'Verde',
    description: 'Verde fresco y natural',
    colors: {
      primaryBase: '#16a34a',
      grayBase: '#64748b',
      secondaryBase: '#15803d',
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#dc2626',
      fontFamily: 'Inter',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'rainbow-blue',
    name: 'Azul',
    description: 'Azul confiable y profesional',
    colors: {
      primaryBase: '#2563eb',
      grayBase: '#64748b',
      secondaryBase: '#1d4ed8',
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#dc2626',
      fontFamily: 'Inter',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'rainbow-indigo',
    name: 'Índigo',
    description: 'Índigo profundo y elegante',
    colors: {
      primaryBase: '#4f46e5',
      grayBase: '#64748b',
      secondaryBase: '#4338ca',
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#dc2626',
      fontFamily: 'Inter',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'rainbow-violet',
    name: 'Violeta',
    description: 'Violeta creativo y sofisticado',
    colors: {
      primaryBase: '#9333ea',
      grayBase: '#64748b',
      secondaryBase: '#7e22ce',
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#dc2626',
      fontFamily: 'Inter',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      textOnColor: '#ffffff'
    }
  },
  // MODO OSCURO - Usando valores estándar de Tailwind CSS
  {
    id: 'dark-red',
    name: 'Oscuro Rojo',
    description: 'Tema oscuro con acentos rojos',
    colors: {
      primaryBase: '#ef4444',
      grayBase: '#111827', // gray-900 (Tailwind)
      secondaryBase: '#1f2937', // gray-800 (Tailwind)
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#ef4444',
      fontFamily: 'Inter',
      textPrimary: '#ffffff', // Blanco
      textSecondary: '#ffffff', // Blanco
      textTertiary: '#ffffff', // Blanco
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'dark-orange',
    name: 'Oscuro Naranja',
    description: 'Tema oscuro con acentos naranjas',
    colors: {
      primaryBase: '#f97316',
      grayBase: '#111827', // gray-900 (Tailwind)
      secondaryBase: '#1f2937', // gray-800 (Tailwind)
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#ef4444',
      fontFamily: 'Inter',
      textPrimary: '#ffffff', // Blanco
      textSecondary: '#ffffff', // Blanco
      textTertiary: '#ffffff', // Blanco
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'dark-yellow',
    name: 'Oscuro Amarillo',
    description: 'Tema oscuro con acentos amarillos',
    colors: {
      primaryBase: '#eab308',
      grayBase: '#111827', // gray-900 (Tailwind)
      secondaryBase: '#1f2937', // gray-800 (Tailwind)
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#ef4444',
      fontFamily: 'Inter',
      textPrimary: '#ffffff', // Blanco
      textSecondary: '#ffffff', // Blanco
      textTertiary: '#ffffff', // Blanco
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'dark-green',
    name: 'Oscuro Verde',
    description: 'Tema oscuro con acentos verdes',
    colors: {
      primaryBase: '#22c55e',
      grayBase: '#111827', // gray-900 (Tailwind)
      secondaryBase: '#1f2937', // gray-800 (Tailwind)
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#ef4444',
      fontFamily: 'Inter',
      textPrimary: '#ffffff', // Blanco
      textSecondary: '#ffffff', // Blanco
      textTertiary: '#ffffff', // Blanco
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'dark-blue',
    name: 'Oscuro Azul',
    description: 'Tema oscuro con acentos azules',
    colors: {
      primaryBase: '#3b82f6',
      grayBase: '#111827', // gray-900 (Tailwind)
      secondaryBase: '#1f2937', // gray-800 (Tailwind)
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#ef4444',
      fontFamily: 'Inter',
      textPrimary: '#ffffff', // Blanco
      textSecondary: '#ffffff', // Blanco
      textTertiary: '#ffffff', // Blanco
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'dark-indigo',
    name: 'Oscuro Índigo',
    description: 'Tema oscuro con acentos índigo',
    colors: {
      primaryBase: '#6366f1',
      grayBase: '#111827', // gray-900 (Tailwind)
      secondaryBase: '#1f2937', // gray-800 (Tailwind)
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#ef4444',
      fontFamily: 'Inter',
      textPrimary: '#ffffff', // Blanco
      textSecondary: '#ffffff', // Blanco
      textTertiary: '#ffffff', // Blanco
      textOnColor: '#ffffff'
    }
  },
  {
    id: 'dark-violet',
    name: 'Oscuro Violeta',
    description: 'Tema oscuro con acentos violetas',
    colors: {
      primaryBase: '#a855f7',
      grayBase: '#111827', // gray-900 (Tailwind)
      secondaryBase: '#1f2937', // gray-800 (Tailwind)
      successBase: '#10b981',
      warningBase: '#f59e0b',
      dangerBase: '#ef4444',
      fontFamily: 'Inter',
      textPrimary: '#ffffff', // Blanco
      textSecondary: '#ffffff', // Blanco
      textTertiary: '#ffffff', // Blanco
      textOnColor: '#ffffff'
    }
  }
]

export function getPresetById(id: string): ThemePreset | undefined {
  return themePresets.find(preset => preset.id === id)
}
