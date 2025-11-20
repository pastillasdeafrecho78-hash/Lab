// Sistema de personalización de colores
// Guarda y carga las preferencias de color del usuario

export interface ThemeColors {
  primaryBase: string // Color base en hex
  grayBase: string // Color base en hex
  secondaryBase: string // Color base para botón secundario
  successBase: string // Color base para botón éxito
  warningBase: string // Color base para botón advertencia
  dangerBase: string // Color base para botón peligro
  fontFamily: string // Familia de fuente
  textPrimary: string // Color de texto principal (sobre fondos)
  textSecondary: string // Color de texto secundario (sobre fondos)
  textTertiary: string // Color de texto terciario (sobre fondos)
  textOnColor: string // Color de texto sobre botones/colores (normalmente blanco)
}

// Colores por defecto
const defaultColors: ThemeColors = {
  primaryBase: '#2563eb', // Azul
  grayBase: '#64748b', // Gris slate
  secondaryBase: '#64748b', // Gris para secundario
  successBase: '#16a34a', // Verde
  warningBase: '#d97706', // Amarillo/Naranja
  dangerBase: '#dc2626', // Rojo
  fontFamily: 'Inter', // Fuente por defecto
  textPrimary: '#0f172a', // gray-900 - Texto sobre fondos
  textSecondary: '#475569', // gray-600 - Texto sobre fondos
  textTertiary: '#64748b', // gray-500 - Texto sobre fondos
  textOnColor: '#ffffff' // Blanco - Texto sobre botones/colores
}

// Tipografías disponibles
export const availableFonts = [
  { name: 'Inter', value: 'Inter', label: 'Inter' },
  { name: 'Roboto', value: 'Roboto', label: 'Roboto' },
  { name: 'Open Sans', value: 'Open Sans', label: 'Open Sans' },
  { name: 'Lato', value: 'Lato', label: 'Lato' },
  { name: 'Montserrat', value: 'Montserrat', label: 'Montserrat' },
  { name: 'Poppins', value: 'Poppins', label: 'Poppins' },
  { name: 'Raleway', value: 'Raleway', label: 'Raleway' },
  { name: 'Source Sans Pro', value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { name: 'Ubuntu', value: 'Ubuntu', label: 'Ubuntu' },
  { name: 'Nunito', value: 'Nunito', label: 'Nunito' }
]

// Función para cargar una fuente de Google Fonts
function loadGoogleFont(fontFamily: string): void {
  if (typeof window === 'undefined') {
    return
  }

  // Mapeo de nombres de fuentes a sus nombres en Google Fonts
  const fontMap: { [key: string]: string } = {
    'Inter': 'Inter:wght@300;400;500;600;700',
    'Roboto': 'Roboto:wght@300;400;500;700',
    'Open Sans': 'Open+Sans:wght@300;400;600;700',
    'Lato': 'Lato:wght@300;400;700',
    'Montserrat': 'Montserrat:wght@300;400;500;600;700',
    'Poppins': 'Poppins:wght@300;400;500;600;700',
    'Raleway': 'Raleway:wght@300;400;500;600;700',
    'Source Sans Pro': 'Source+Sans+Pro:wght@300;400;600;700',
    'Ubuntu': 'Ubuntu:wght@300;400;500;700',
    'Nunito': 'Nunito:wght@300;400;600;700'
  }

  const googleFontName = fontMap[fontFamily]
  if (!googleFontName) {
    return
  }

  // Verificar si la fuente ya está cargada
  const existingLink = document.querySelector(`link[data-font="${fontFamily}"]`)
  if (existingLink) {
    return
  }

  // Crear y agregar el link para cargar la fuente
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${googleFontName}&display=swap`
  link.setAttribute('data-font', fontFamily)
  document.head.appendChild(link)
}

// Función para generar escala de colores desde un color base
function generateColorScale(hex: string): { [key: string]: string } {
  const rgb = hexToRgb(hex)
  if (!rgb) return {}

  // Convertir RGB a HSL para generar la escala
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  
  const scale: { [key: string]: string } = {}
  
  // Generar tonos más claros (50-400)
  scale['50'] = hslToRgbString(hsl.h, hsl.s, Math.min(98, hsl.l + 45))
  scale['100'] = hslToRgbString(hsl.h, hsl.s, Math.min(95, hsl.l + 40))
  scale['200'] = hslToRgbString(hsl.h, hsl.s, Math.min(90, hsl.l + 30))
  scale['300'] = hslToRgbString(hsl.h, hsl.s, Math.min(80, hsl.l + 20))
  scale['400'] = hslToRgbString(hsl.h, hsl.s, Math.min(70, hsl.l + 10))
  
  // Color base (500)
  scale['500'] = `${rgb.r}, ${rgb.g}, ${rgb.b}`
  
  // Generar tonos más oscuros (600-900)
  scale['600'] = hslToRgbString(hsl.h, Math.min(100, hsl.s + 5), Math.max(20, hsl.l - 10))
  scale['700'] = hslToRgbString(hsl.h, Math.min(100, hsl.s + 10), Math.max(15, hsl.l - 20))
  scale['800'] = hslToRgbString(hsl.h, Math.min(100, hsl.s + 15), Math.max(10, hsl.l - 30))
  scale['900'] = hslToRgbString(hsl.h, Math.min(100, hsl.s + 20), Math.max(5, hsl.l - 40))
  
  return scale
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToRgbString(h: number, s: number, l: number): string {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else if (300 <= h && h < 360) {
    r = c
    g = 0
    b = x
  }

  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)

  return `${r}, ${g}, ${b}`
}

export function getThemeColors(userId?: string): ThemeColors {
  if (typeof window === 'undefined') {
    return defaultColors
  }

  // Si no hay userId, intentar obtenerlo del token o usar configuración global (retrocompatibilidad)
  if (!userId) {
    // Intentar obtener userId del token almacenado
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.userId
      }
    } catch {
      // Si no se puede obtener, usar configuración global (para retrocompatibilidad)
      const saved = localStorage.getItem('theme-colors')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Asegurar que todos los campos estén presentes
          return { ...defaultColors, ...parsed }
        } catch {
          return defaultColors
        }
      }
      return defaultColors
    }
  }

  // Buscar configuración específica del usuario
  const saved = localStorage.getItem(`theme-colors-${userId}`)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      // Asegurar que todos los campos estén presentes (merge con defaults)
      return { ...defaultColors, ...parsed }
    } catch {
      return defaultColors
    }
  }

  return defaultColors
}

export function saveThemeColors(colors: ThemeColors, userId?: string): void {
  if (typeof window === 'undefined') {
    return
  }

  // Si no hay userId, intentar obtenerlo del token
  if (!userId) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.userId
      }
    } catch {
      // Si no se puede obtener, guardar como configuración global (retrocompatibilidad)
      localStorage.setItem('theme-colors', JSON.stringify(colors))
      applyThemeColors(colors)
      return
    }
  }

  // Guardar configuración específica del usuario
  if (userId) {
    localStorage.setItem(`theme-colors-${userId}`, JSON.stringify(colors))
    applyThemeColors(colors)
  }
}

export function applyThemeColors(colors: ThemeColors): void {
  if (typeof window === 'undefined') {
    return
  }

  const root = document.documentElement

  // Detectar si es modo oscuro (grayBase muy oscuro)
  const rgb = hexToRgb(colors.grayBase)
  const isDarkMode = rgb && (rgb.r + rgb.g + rgb.b) < 100 // Si la suma de RGB es menor a 100, es muy oscuro
  
  // Agregar atributo data-dark-mode para CSS
  if (isDarkMode) {
    root.setAttribute('data-dark-mode', 'true')
  } else {
    root.removeAttribute('data-dark-mode')
  }

  // Generar y aplicar escalas de colores
  const primaryScale = generateColorScale(colors.primaryBase)
  let grayScale: { [key: string]: string }
  
  if (isDarkMode) {
    // Para modo oscuro, usar valores prácticamente negros (invertir la escala)
    grayScale = {
      '50': '9, 9, 11',         // Casi negro puro (zinc-950)
      '100': '17, 24, 39',      // Casi negro (gray-900)
      '200': '31, 41, 55',      // Muy oscuro (gray-800)
      '300': '55, 65, 81',      // Oscuro (gray-700)
      '400': '75, 85, 99',      // Gris oscuro (gray-600)
      '500': '107, 114, 128',   // Gris medio (gray-500)
      '600': '75, 85, 99',      // Gris oscuro (gray-600)
      '700': '55, 65, 81',      // Oscuro (gray-700)
      '800': '31, 41, 55',      // Muy oscuro (gray-800)
      '900': '17, 24, 39'       // Casi negro (gray-900)
    }
  } else {
    grayScale = generateColorScale(colors.grayBase)
  }
  
  const secondaryScale = generateColorScale(colors.secondaryBase)
  const successScale = generateColorScale(colors.successBase)
  const warningScale = generateColorScale(colors.warningBase)
  const dangerScale = generateColorScale(colors.dangerBase)

  // Aplicar colores primarios
  Object.entries(primaryScale).forEach(([key, value]) => {
    root.style.setProperty(`--color-primary-${key}`, value)
  })

  // Aplicar colores grises
  Object.entries(grayScale).forEach(([key, value]) => {
    root.style.setProperty(`--color-gray-${key}`, value)
  })

  // Aplicar colores secundarios
  Object.entries(secondaryScale).forEach(([key, value]) => {
    root.style.setProperty(`--color-secondary-${key}`, value)
  })

  // Aplicar colores de éxito
  Object.entries(successScale).forEach(([key, value]) => {
    root.style.setProperty(`--color-success-${key}`, value)
  })

  // Aplicar colores de advertencia
  Object.entries(warningScale).forEach(([key, value]) => {
    root.style.setProperty(`--color-warning-${key}`, value)
  })

  // Aplicar colores de peligro
  Object.entries(dangerScale).forEach(([key, value]) => {
    root.style.setProperty(`--color-danger-${key}`, value)
  })

  // Aplicar tipografía
  if (colors.fontFamily) {
    // Cargar la fuente desde Google Fonts si no está ya cargada
    loadGoogleFont(colors.fontFamily)
    
    // Aplicar la fuente
    root.style.setProperty('--font-family', `'${colors.fontFamily}', system-ui, sans-serif`)
    document.body.style.fontFamily = `'${colors.fontFamily}', system-ui, sans-serif`
  }

  // Aplicar colores de texto
  // Si es modo oscuro, forzar todos los textos a blanco
  if (isDarkMode) {
    root.style.setProperty('--color-text-primary', '#ffffff')
    root.style.setProperty('--color-text-secondary', '#ffffff')
    root.style.setProperty('--color-text-tertiary', '#ffffff')
    root.style.setProperty('--color-text-on-color', '#ffffff')
  } else {
    if (colors.textPrimary) {
      root.style.setProperty('--color-text-primary', colors.textPrimary)
    }
    if (colors.textSecondary) {
      root.style.setProperty('--color-text-secondary', colors.textSecondary)
    }
    if (colors.textTertiary) {
      root.style.setProperty('--color-text-tertiary', colors.textTertiary)
    }
    if (colors.textOnColor) {
      root.style.setProperty('--color-text-on-color', colors.textOnColor)
    }
  }
}

export function resetThemeColors(userId?: string): void {
  saveThemeColors(defaultColors, userId)
}

// Aplicar colores al cargar (solo si hay un usuario)
if (typeof window !== 'undefined') {
  // Intentar obtener userId del token
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]))
      applyThemeColors(getThemeColors(payload.userId))
    } else {
      // Si no hay token, usar configuración global o defaults
      applyThemeColors(getThemeColors())
    }
  } catch {
    // Si hay error, usar defaults
    applyThemeColors(defaultColors)
  }
}

