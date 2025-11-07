// User types
export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  role: UserRole;
  sucursales: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  RESPONSABLE_SANITARIO = 'RESPONSABLE_SANITARIO',
  RESPONSABLE_SUCURSAL = 'RESPONSABLE_SUCURSAL',
  TECNICO_LABORATORIO = 'TECNICO_LABORATORIO',
  RECEPCION = 'RECEPCION',
  CLIENTE = 'CLIENTE'
}

// Sucursal types
export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Maquinaria types
export interface Maquinaria {
  id: string;
  nombre: string;
  modelo: string;
  marca: string;
  numeroSerie: string;
  sucursalId: string;
  tipoPruebas: string[];
  isActive: boolean;
  ultimoMantenimiento?: string;
  proximoMantenimiento?: string;
  createdAt: string;
  updatedAt: string;
}

// Cliente types
export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  genero: 'M' | 'F' | 'O';
  direccion?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Comanda types
export interface Comanda {
  id: string;
  numeroComanda: string;
  clienteId: string;
  sucursalId: string;
  tipoPrueba: TipoPrueba;
  elementos: string[];
  estado: EstadoComanda;
  fechaCreacion: string;
  fechaAsignacion?: string;
  fechaCompletado?: string;
  observaciones?: string;
  responsableId: string;
  tecnicoId?: string;
  createdAt: string;
  updatedAt: string;
}

export enum EstadoComanda {
  PENDIENTE = 'PENDIENTE',
  ASIGNADA = 'ASIGNADA',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADA = 'COMPLETADA',
  ENTREGADA = 'ENTREGADA',
  CANCELADA = 'CANCELADA'
}

export enum TipoPrueba {
  QUIMICA_COMPLETA_6 = 'QUIMICA_COMPLETA_6',
  QUIMICA_BASICA_3 = 'QUIMICA_BASICA_3',
  HEMATOLOGIA_COMPLETA = 'HEMATOLOGIA_COMPLETA',
  PERFIL_PERSONALIZADO = 'PERFIL_PERSONALIZADO'
}

// Resultado types
export interface Resultado {
  id: string;
  comandaId: string;
  elemento: string;
  valor: number;
  unidad: string;
  rangoNormal: {
    min: number;
    max: number;
  };
  esNormal: boolean;
  observaciones?: string;
  tecnicoId: string;
  fechaResultado: string;
  createdAt: string;
  updatedAt: string;
}

// Chat types
export interface ChatRoom {
  id: string;
  nombre: string;
  tipo: TipoSala;
  sucursalId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum TipoSala {
  GENERAL = 'GENERAL',
  SUCURSAL = 'SUCURSAL',
  PRIVADA = 'PRIVADA'
}

export interface Mensaje {
  id: string;
  salaId: string;
  usuarioId: string;
  contenido: string;
  tipo: TipoMensaje;
  archivoUrl?: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum TipoMensaje {
  TEXTO = 'TEXTO',
  IMAGEN = 'IMAGEN',
  ARCHIVO = 'ARCHIVO',
  SISTEMA = 'SISTEMA'
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  role: UserRole;
  sucursales?: string[];
}

// Form types
export interface ComandaFormData {
  clienteId: string;
  sucursalId: string;
  tipoPrueba: TipoPrueba;
  elementos: string[];
  observaciones?: string;
}

export interface ResultadoFormData {
  comandaId: string;
  elemento: string;
  valor: number;
  unidad: string;
  rangoNormalMin: number;
  rangoNormalMax: number;
  observaciones?: string;
}

export interface ClienteFormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  genero: 'M' | 'F' | 'O';
  direccion?: string;
}

// Socket types
export interface SocketMessage {
  id: string;
  salaId: string;
  usuarioId: string;
  contenido: string;
  tipo: TipoMensaje;
  archivoUrl?: string;
  isEdited: boolean;
  createdAt: string;
  usuario?: {
    id: string;
    nombre: string;
    apellido: string;
    role: string;
  };
}

export interface NotificationData {
  tipo: 'comanda' | 'resultado' | 'chat' | 'sistema';
  titulo: string;
  mensaje: string;
  destinatarios: string[];
  datos?: any;
}

// Dashboard types
export interface DashboardStats {
  totalComandas: number;
  comandasPendientes: number;
  comandasCompletadas: number;
  totalClientes: number;
  totalSucursales: number;
  totalMaquinaria: number;
}

export interface ComandaStats {
  porEstado: Record<EstadoComanda, number>;
  porSucursal: Record<string, number>;
  porTipo: Record<TipoPrueba, number>;
  tendencia: Array<{
    fecha: string;
    cantidad: number;
  }>;
}
