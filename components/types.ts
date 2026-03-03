// Tipos para el componente ComandaLetterhead

export interface Analito {
  id: string
  nombre: string
  descripcion?: string | null
  unidad?: string | null
  activo: boolean
}

export interface CategoriaAnalitoDetalle {
  analito: Analito
  orden: number
}

export interface CategoriaAnalito {
  id: string
  nombre: string
  descripcion?: string | null
  analitos: CategoriaAnalitoDetalle[]
}

export interface TipoPruebaCategoria {
  categoria: CategoriaAnalito
}

export interface TipoPrueba {
  id: string
  nombre: string
  descripcion?: string | null
  elementos: string[]
  categorias?: TipoPruebaCategoria[]
  analitosAsignados?: Array<{
    analito: Analito
  }>
}

export interface Cliente {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string | null
  fechaNacimiento?: string | null
  genero?: string | null
  direccion?: string | null
}

export interface Sucursal {
  id: string
  nombre: string
  direccion: string
  telefono: string
  email?: string | null
}

export interface Resultado {
  id: string
  elemento: string
  valor: number
  unidad: string
  rangoNormal: string
  observaciones?: string | null
  fechaRegistro: string
}

export interface ElementoAgrupado {
  nombre: string
  unidad?: string
  descripcion?: string
  orden: number
  tieneResultado: boolean
  resultado?: Resultado
}

export interface GrupoElementos {
  categoria: CategoriaAnalito | null
  elementos: ElementoAgrupado[]
}

export interface LaboratorioInfo {
  nombre: string
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  rfc?: string | null
  logoUrl?: string | null
  responsableSanitario?: string | null
}

export interface ComandaConCategorias {
  id: string
  numeroComanda: string
  estado: string
  fechaCreacion: string
  fechaAsignacion?: string | null
  fechaCompletado?: string | null
  fechaEntrega?: string | null
  fechaArchivado?: string | null
  observaciones?: string | null
  archivada?: boolean
  cliente: Cliente
  sucursal: Sucursal
  tipoPrueba: TipoPrueba
  elementos: string[]
  resultados: Resultado[]
  elementosAgrupados: GrupoElementos[]
  laboratorioInfo?: LaboratorioInfo
}

// Template para personalizar la visualización (solo mostrar/ocultar, NO contenido)
export interface HeaderConfig {
  showLogo: boolean
  showLabName: boolean
  showLabAddress: boolean
  showLabPhone: boolean
  showSucursal: boolean
  alignment: 'left' | 'center' | 'right'
}

export interface PacienteBlockConfig {
  showNombre: boolean
  showFechaNacimiento: boolean
  showEdad: boolean
  showTelefono: boolean
  showEmail: boolean
}

export interface ComandaBlockConfig {
  showNumeroComanda: boolean
  showFechaCreacion: boolean
  showFechaEntrega: boolean
  showEstado: boolean
}

export interface AnalitosBlockConfig {
  showUnidad: boolean
  showDescripcionAnalito: boolean
  showResultados: boolean
}

export interface FooterConfig {
  showFooter: boolean
  showConfidentialText: boolean
}

export interface ComandaTemplate {
  marginTop: number // mm
  marginBottom: number // mm
  marginLeft: number // mm
  marginRight: number // mm
  header: HeaderConfig
  pacienteBlock: PacienteBlockConfig
  comandaBlock: ComandaBlockConfig
  analitosBlock: AnalitosBlockConfig
  footer: FooterConfig
}

