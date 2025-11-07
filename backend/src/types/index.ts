import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & {
    id: string;
    email: string;
    role: string;
    sucursales: string[];
  };
}

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
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  RESPONSABLE_SANITARIO = 'responsable_sanitario',
  RESPONSABLE_SUCURSAL = 'responsable_sucursal',
  TECNICO_LABORATORIO = 'tecnico_laboratorio',
  RECEPCION = 'recepcion',
  CLIENTE = 'cliente'
}

// Sucursal types
export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email?: string;
  responsableId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  ultimoMantenimiento?: Date;
  proximoMantenimiento?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Cliente types
export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fechaNacimiento: Date;
  genero: 'M' | 'F' | 'O';
  direccion?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  fechaCreacion: Date;
  fechaAsignacion?: Date;
  fechaCompletado?: Date;
  observaciones?: string;
  responsableId: string;
  tecnicoId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum EstadoComanda {
  PENDIENTE = 'pendiente',
  ASIGNADA = 'asignada',
  EN_PROCESO = 'en_proceso',
  COMPLETADA = 'completada',
  ENTREGADA = 'entregada',
  CANCELADA = 'cancelada'
}

export enum TipoPrueba {
  QUIMICA_COMPLETA_6 = 'quimica_completa_6',
  QUIMICA_BASICA_3 = 'quimica_basica_3',
  HEMATOLOGIA_COMPLETA = 'hematologia_completa',
  PERFIL_PERSONALIZADO = 'perfil_personalizado'
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
  fechaResultado: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Chat types
export interface ChatRoom {
  id: string;
  nombre: string;
  tipo: TipoSala;
  sucursalId?: string;
  participantes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum TipoSala {
  GENERAL = 'general',
  SUCURSAL = 'sucursal',
  PRIVADA = 'privada'
}

export interface Mensaje {
  id: string;
  salaId: string;
  usuarioId: string;
  contenido: string;
  tipo: TipoMensaje;
  archivoUrl?: string;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum TipoMensaje {
  TEXTO = 'texto',
  IMAGEN = 'imagen',
  ARCHIVO = 'archivo',
  SISTEMA = 'sistema'
}

// Audit types
export interface AuditLog {
  id: string;
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  ip: string;
  userAgent: string;
  timestamp: Date;
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

// Socket types
export interface SocketData {
  userId: string;
  sucursalId?: string;
  role: string;
}

export interface ChatMessageData {
  salaId: string;
  contenido: string;
  tipo: TipoMensaje;
  archivoUrl?: string;
}

export interface NotificationData {
  tipo: 'comanda' | 'resultado' | 'chat' | 'sistema';
  titulo: string;
  mensaje: string;
  destinatarios: string[];
  datos?: any;
}
