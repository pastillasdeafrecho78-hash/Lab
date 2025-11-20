import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date utilities
export function formatDate(date: string | Date, formatStr = 'dd/MM/yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Fecha inválida';
    return format(dateObj, formatStr, { locale: es });
  } catch (error) {
    return 'Fecha inválida';
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

export function formatTime(date: string | Date): string {
  return formatDate(date, 'HH:mm');
}

// String utilities
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

// Number utilities
export function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+52\s?)?(\d{2,3}\s?)?\d{3,4}\s?\d{4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Status utilities
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'PENDIENTE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'ASIGNADA': 'bg-blue-100 text-blue-800 border-blue-200',
    'EN_PROCESO': 'bg-orange-100 text-orange-800 border-orange-200',
    'COMPLETADA': 'bg-green-100 text-green-800 border-green-200',
    'ENTREGADA': 'bg-gray-100 text-gray-800 border-gray-200',
    'CANCELADA': 'bg-red-100 text-red-800 border-red-200',
    'SUPER_ADMIN': 'bg-purple-100 text-purple-800 border-purple-200',
    'RESPONSABLE_SANITARIO': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'RESPONSABLE_SUCURSAL': 'bg-blue-100 text-blue-800 border-blue-200',
    'TECNICO_LABORATORIO': 'bg-green-100 text-green-800 border-green-200',
    'RECEPCION': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'CLIENTE': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    'PENDIENTE': 'Pendiente',
    'ASIGNADA': 'Asignada',
    'EN_PROCESO': 'En Proceso',
    'COMPLETADA': 'Completada',
    'ENTREGADA': 'Entregada',
    'CANCELADA': 'Cancelada',
    'SUPER_ADMIN': 'Super Admin',
    'RESPONSABLE_SANITARIO': 'Responsable Sanitario',
    'RESPONSABLE_SUCURSAL': 'Responsable Sucursal',
    'TECNICO_LABORATORIO': 'Técnico Laboratorio',
    'RECEPCION': 'Recepción',
    'CLIENTE': 'Cliente'
  };
  
  return statusLabels[status] || status;
}

// File utilities
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// Array utilities
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Local storage utilities
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage key "${key}":`, error);
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Deep clone utility
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}
