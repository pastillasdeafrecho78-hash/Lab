import { Rol, EstadoComanda, TipoPrueba, TipoChat } from '@prisma/client'

export interface Usuario {
  id: string
  email: string
  nombre: string
  apellido: string
  telefono?: string
  rol: Rol
  activo: boolean
  ultimoAcceso?: Date
  sucursales: Sucursal[]
}

export interface Sucursal {
  id: string
  nombre: string
  direccion: string
  telefono: string
  email?: string
  activa: boolean
  usuarios?: Usuario[]
  maquinaria?: Maquinaria[]
}

export interface Maquinaria {
  id: string
  nombre: string
  modelo?: string
  marca?: string
  serie?: string
  activa: boolean
  sucursalId: string
  sucursal?: Sucursal
  pruebas?: TipoPrueba[]
}

export interface TipoPrueba {
  id: string
  nombre: string
  descripcion?: string
  elementos: string[]
  activo: boolean
}

export interface Cliente {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  fechaNacimiento?: Date
  genero?: string
  direccion?: string
  activo: boolean
}

export interface Comanda {
  id: string
  numeroComanda: string
  clienteId: string
  sucursalId: string
  tipoPruebaId: string
  elementos: string[]
  estado: EstadoComanda
  observaciones?: string
  fechaCreacion: Date
  fechaAsignacion?: Date
  fechaCompletado?: Date
  fechaEntrega?: Date
  cliente?: Cliente
  sucursal?: Sucursal
  tipoPrueba?: TipoPrueba
  creadoPor?: Usuario
  asignadoA?: Usuario
  resultados?: Resultado[]
}

export interface Resultado {
  id: string
  comandaId: string
  elemento: string
  valor: number
  unidad: string
  rangoNormal: string
  observaciones?: string
  fechaRegistro: Date
  registradoPor?: Usuario
}

export interface Mensaje {
  id: string
  contenido: string
  tipo: TipoChat
  sucursalId?: string
  remitenteId: string
  destinatarioId?: string
  leido: boolean
  fechaEnvio: Date
  remitente?: Usuario
  sucursal?: Sucursal
}

export interface Auditoria {
  id: string
  usuarioId: string
  accion: string
  tabla: string
  registroId?: string
  datosAnteriores?: any
  datosNuevos?: any
  ip?: string
  userAgent?: string
  dispositivo?: string
  fecha: Date
  usuario?: Usuario
}

// Tipos para formularios
export interface LoginForm {
  email: string
  password: string
}

export interface ComandaForm {
  clienteId: string
  sucursalId: string
  tipoPruebaId: string
  elementos: string[]
  observaciones?: string
}

export interface ResultadoForm {
  comandaId: string
  elemento: string
  valor: number
  unidad: string
  rangoNormal: string
  observaciones?: string
}

// Tipos para respuestas de API
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Tipos para permisos
export interface Permisos {
  comandas: {
    crear: boolean
    ver: boolean
    editar: boolean
    eliminar: boolean
  }
  sucursales: {
    crear: boolean
    ver: boolean
    editar: boolean
    eliminar: boolean
  }
  maquinaria: {
    crear: boolean
    ver: boolean
    editar: boolean
    eliminar: boolean
  }
  usuarios: {
    crear: boolean
    ver: boolean
    editar: boolean
    eliminar: boolean
  }
  chat: {
    enviar: boolean
    ver: boolean
  }
  auditoria: {
    ver: boolean
  }
}

// Configuración de elementos por tipo de prueba
export const ELEMENTOS_PRUEBA = {
  QUIMICA_COMPLETA_6: [
    'glucosa',
    'colesterol_total',
    'trigliceridos',
    'hdl_colesterol',
    'ldl_colesterol',
    'hemoglobina_glicosilada'
  ],
  QUIMICA_BASICA_3: [
    'glucosa',
    'colesterol_total',
    'trigliceridos'
  ],
  HEMATOLOGIA_COMPLETA: [
    'hemoglobina',
    'hematocrito',
    'leucocitos',
    'neutrofilos',
    'linfocitos',
    'monocitos',
    'eosinofilos',
    'basofilos',
    'plaquetas'
  ]
} as const

export type ElementoPrueba = typeof ELEMENTOS_PRUEBA[keyof typeof ELEMENTOS_PRUEBA][number]
