// Templates predefinidos para ComandaLetterhead

import type { ComandaTemplate } from '@/components/types'

/**
 * Template por defecto para comandas de laboratorio
 */
export const templateDefault: ComandaTemplate = {
  marginTop: 15,
  marginBottom: 15,
  marginLeft: 20,
  marginRight: 20,
  header: {
    showLogo: false,
    showLabName: true,
    showLabAddress: true,
    showLabPhone: true,
    showSucursal: true,
    alignment: 'left'
  },
  pacienteBlock: {
    showNombre: true,
    showFechaNacimiento: true,
    showEdad: true,
    showTelefono: true,
    showEmail: true
  },
  comandaBlock: {
    showNumeroComanda: true,
    showFechaCreacion: true,
    showFechaEntrega: true,
    showEstado: true
  },
  analitosBlock: {
    showUnidad: true,
    showDescripcionAnalito: false,
    showResultados: true
  },
  footer: {
    showFooter: true,
    showConfidentialText: true
  }
}

/**
 * Template minimalista (sin información extra)
 */
export const templateMinimal: ComandaTemplate = {
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 15,
  marginRight: 15,
  header: {
    showLogo: false,
    showLabName: true,
    showLabAddress: false,
    showLabPhone: false,
    showSucursal: false,
    alignment: 'center'
  },
  pacienteBlock: {
    showNombre: true,
    showFechaNacimiento: false,
    showEdad: false,
    showTelefono: false,
    showEmail: false
  },
  comandaBlock: {
    showNumeroComanda: true,
    showFechaCreacion: true,
    showFechaEntrega: false,
    showEstado: false
  },
  analitosBlock: {
    showUnidad: true,
    showDescripcionAnalito: false,
    showResultados: false
  },
  footer: {
    showFooter: false,
    showConfidentialText: false
  }
}

/**
 * Template completo (con toda la información)
 */
export const templateCompleto: ComandaTemplate = {
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 25,
  marginRight: 25,
  header: {
    showLogo: true,
    showLabName: true,
    showLabAddress: true,
    showLabPhone: true,
    showSucursal: true,
    alignment: 'left'
  },
  pacienteBlock: {
    showNombre: true,
    showFechaNacimiento: true,
    showEdad: true,
    showTelefono: true,
    showEmail: true
  },
  comandaBlock: {
    showNumeroComanda: true,
    showFechaCreacion: true,
    showFechaEntrega: true,
    showEstado: true
  },
  analitosBlock: {
    showUnidad: true,
    showDescripcionAnalito: true,
    showResultados: true
  },
  footer: {
    showFooter: true,
    showConfidentialText: true
  }
}

