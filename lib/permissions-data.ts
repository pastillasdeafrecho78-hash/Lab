import { Rol } from '@prisma/client'

export interface PermissionDefinition {
  clave: string
  nombre: string
  descripcion: string
  categoria: string
}

export interface PermissionPackageDefinition {
  nombre: string
  descripcion: string
  rolBase: Rol
  permisos: Record<string, boolean>
}

export const PERMISSIONS_DEFINITIONS: PermissionDefinition[] = [
  {
    clave: 'dashboard.ver',
    nombre: 'Ver dashboard',
    descripcion: 'Puede acceder al tablero principal con métricas del laboratorio',
    categoria: 'Dashboard'
  },
  {
    clave: 'usuarios.ver',
    nombre: 'Ver usuarios',
    descripcion: 'Puede visualizar la lista de usuarios del sistema',
    categoria: 'Usuarios'
  },
  {
    clave: 'usuarios.crear',
    nombre: 'Crear usuarios',
    descripcion: 'Puede crear nuevos usuarios',
    categoria: 'Usuarios'
  },
  {
    clave: 'usuarios.editar',
    nombre: 'Editar usuarios',
    descripcion: 'Puede editar información de usuarios existentes',
    categoria: 'Usuarios'
  },
  {
    clave: 'usuarios.gestionar-paquetes',
    nombre: 'Gestionar paquetes de permisos',
    descripcion: 'Puede crear y modificar paquetes de permisos predefinidos',
    categoria: 'Usuarios'
  },
  {
    clave: 'clientes.ver',
    nombre: 'Ver clientes',
    descripcion: 'Puede visualizar la lista de clientes',
    categoria: 'Clientes'
  },
  {
    clave: 'clientes.editar',
    nombre: 'Editar clientes',
    descripcion: 'Puede crear o actualizar información de clientes',
    categoria: 'Clientes'
  },
  {
    clave: 'clientes.ver-historial',
    nombre: 'Ver historial y compras',
    descripcion: 'Puede ver historial de comandas, compras y resultados de un cliente',
    categoria: 'Clientes'
  },
  {
    clave: 'comandas.ver',
    nombre: 'Ver comandas',
    descripcion: 'Puede consultar la lista de comandas',
    categoria: 'Comandas'
  },
  {
    clave: 'comandas.crear',
    nombre: 'Crear comandas',
    descripcion: 'Puede crear nuevas comandas',
    categoria: 'Comandas'
  },
  {
    clave: 'comandas.editar',
    nombre: 'Editar comandas',
    descripcion: 'Puede actualizar información de una comanda',
    categoria: 'Comandas'
  },
  {
    clave: 'comandas.resultados',
    nombre: 'Gestionar resultados',
    descripcion: 'Puede registrar, editar y cerrar resultados de laboratorio',
    categoria: 'Comandas'
  },
  {
    clave: 'comandas.pdf',
    nombre: 'Generar PDFs',
    descripcion: 'Puede generar PDFs de comandas y resultados',
    categoria: 'Comandas'
  },
  {
    clave: 'reportes.ver',
    nombre: 'Ver reportes',
    descripcion: 'Puede acceder al módulo de reportes y estadísticas',
    categoria: 'Reportes'
  },
  {
    clave: 'chat.general',
    nombre: 'Chat general',
    descripcion: 'Puede enviar mensajes al chat general',
    categoria: 'Chat'
  },
  {
    clave: 'chat.sucursal',
    nombre: 'Chat por sucursal',
    descripcion: 'Puede participar en chats específicos de sucursal',
    categoria: 'Chat'
  },
  {
    clave: 'chat.privado',
    nombre: 'Mensajes privados',
    descripcion: 'Puede enviar mensajes directos a otros usuarios',
    categoria: 'Chat'
  },
  {
    clave: 'maquinaria.ver',
    nombre: 'Ver maquinaria',
    descripcion: 'Puede visualizar información de equipos y mantenimiento',
    categoria: 'Operaciones'
  },
  {
    clave: 'maquinaria.editar',
    nombre: 'Gestionar maquinaria',
    descripcion: 'Puede registrar, editar y programar mantenimiento de equipos',
    categoria: 'Operaciones'
  },
  {
    clave: 'notificaciones.email',
    nombre: 'Notificaciones por email',
    descripcion: 'Puede configurar y enviar notificaciones por email',
    categoria: 'Notificaciones'
  },
  {
    clave: 'catalogo.analitos.ver',
    nombre: 'Ver parámetros de laboratorio',
    descripcion: 'Puede consultar el catálogo de parámetros disponibles',
    categoria: 'Catálogo'
  },
  {
    clave: 'catalogo.analitos.crear',
    nombre: 'Registrar parámetros',
    descripcion: 'Puede crear nuevos parámetros de laboratorio',
    categoria: 'Catálogo'
  },
  {
    clave: 'catalogo.analitos.editar',
    nombre: 'Editar parámetros',
    descripcion: 'Puede modificar información de parámetros existentes',
    categoria: 'Catálogo'
  },
  {
    clave: 'catalogo.analitos.eliminar',
    nombre: 'Eliminar parámetros',
    descripcion: 'Puede desactivar o eliminar parámetros del catálogo',
    categoria: 'Catálogo'
  },
  {
    clave: 'catalogo.categorias.ver',
    nombre: 'Ver categorías de pruebas',
    descripcion: 'Puede consultar las categorías de pruebas y sus componentes',
    categoria: 'Catálogo'
  },
  {
    clave: 'catalogo.categorias.crear',
    nombre: 'Registrar categorías de pruebas',
    descripcion: 'Puede crear nuevas categorías agrupando parámetros',
    categoria: 'Catálogo'
  },
  {
    clave: 'catalogo.categorias.editar',
    nombre: 'Editar categorías de pruebas',
    descripcion: 'Puede modificar categorías y sus parámetros asociados',
    categoria: 'Catálogo'
  },
  {
    clave: 'catalogo.categorias.eliminar',
    nombre: 'Eliminar categorías de pruebas',
    descripcion: 'Puede desactivar o eliminar categorías del catálogo',
    categoria: 'Catálogo'
  }
]

export const DEFAULT_PERMISSION_PACKAGES: PermissionPackageDefinition[] = [
  {
    nombre: 'Administrador General',
    descripcion: 'Acceso total a todas las funcionalidades administrativas',
    rolBase: Rol.SUPER_ADMIN,
    permisos: Object.fromEntries(PERMISSIONS_DEFINITIONS.map(permiso => [permiso.clave, true]))
  },
  {
    nombre: 'Responsable Sanitario',
    descripcion: 'Control clínico completo con visibilidad total de resultados',
    rolBase: Rol.RESPONSABLE_SANITARIO,
    permisos: {
      'dashboard.ver': true,
      'usuarios.ver': true,
      'usuarios.crear': false,
      'usuarios.editar': false,
      'usuarios.gestionar-paquetes': false,
      'clientes.ver': true,
      'clientes.editar': true,
      'clientes.ver-historial': true,
      'comandas.ver': true,
      'comandas.crear': true,
      'comandas.editar': true,
      'comandas.resultados': true,
      'comandas.pdf': true,
      'reportes.ver': true,
      'chat.general': true,
      'chat.sucursal': true,
      'chat.privado': true,
      'maquinaria.ver': true,
      'maquinaria.editar': true,
      'notificaciones.email': true,
      'catalogo.analitos.ver': true,
      'catalogo.analitos.crear': true,
      'catalogo.analitos.editar': true,
      'catalogo.analitos.eliminar': true,
      'catalogo.categorias.ver': true,
      'catalogo.categorias.crear': true,
      'catalogo.categorias.editar': true,
      'catalogo.categorias.eliminar': true
    }
  },
  {
    nombre: 'Responsable de Sucursal',
    descripcion: 'Administración operativa de una sucursal específica',
    rolBase: Rol.RESPONSABLE_SUCURSAL,
    permisos: {
      'dashboard.ver': true,
      'usuarios.ver': true,
      'usuarios.crear': false,
      'usuarios.editar': false,
      'usuarios.gestionar-paquetes': false,
      'clientes.ver': true,
      'clientes.editar': true,
      'clientes.ver-historial': true,
      'comandas.ver': true,
      'comandas.crear': true,
      'comandas.editar': true,
      'comandas.resultados': true,
      'comandas.pdf': true,
      'reportes.ver': true,
      'chat.general': true,
      'chat.sucursal': true,
      'chat.privado': true,
      'maquinaria.ver': true,
      'maquinaria.editar': true,
      'notificaciones.email': true,
      'catalogo.analitos.ver': true,
      'catalogo.analitos.crear': false,
      'catalogo.analitos.editar': false,
      'catalogo.analitos.eliminar': false,
      'catalogo.categorias.ver': true,
      'catalogo.categorias.crear': false,
      'catalogo.categorias.editar': false,
      'catalogo.categorias.eliminar': false
    }
  },
  {
    nombre: 'Técnico de Laboratorio',
    descripcion: 'Operación técnica del laboratorio con foco en resultados',
    rolBase: Rol.TECNICO_LABORATORIO,
    permisos: {
      'dashboard.ver': true,
      'usuarios.ver': false,
      'usuarios.crear': false,
      'usuarios.editar': false,
      'usuarios.gestionar-paquetes': false,
      'clientes.ver': true,
      'clientes.editar': false,
      'clientes.ver-historial': true,
      'comandas.ver': true,
      'comandas.crear': false,
      'comandas.editar': false,
      'comandas.resultados': true,
      'comandas.pdf': true,
      'reportes.ver': false,
      'chat.general': true,
      'chat.sucursal': true,
      'chat.privado': false,
      'maquinaria.ver': true,
      'maquinaria.editar': false,
      'notificaciones.email': false,
      'catalogo.analitos.ver': true,
      'catalogo.analitos.crear': false,
      'catalogo.analitos.editar': false,
      'catalogo.analitos.eliminar': false,
      'catalogo.categorias.ver': true,
      'catalogo.categorias.crear': false,
      'catalogo.categorias.editar': false,
      'catalogo.categorias.eliminar': false
    }
  },
  {
    nombre: 'Recepción',
    descripcion: 'Registro de pacientes y comandas con acceso limitado',
    rolBase: Rol.RECEPCION,
    permisos: {
      'dashboard.ver': true,
      'usuarios.ver': false,
      'usuarios.crear': false,
      'usuarios.editar': false,
      'usuarios.gestionar-paquetes': false,
      'clientes.ver': true,
      'clientes.editar': true,
      'clientes.ver-historial': false,
      'comandas.ver': true,
      'comandas.crear': true,
      'comandas.editar': false,
      'comandas.resultados': false,
      'comandas.pdf': false,
      'reportes.ver': false,
      'chat.general': true,
      'chat.sucursal': true,
      'chat.privado': false,
      'maquinaria.ver': false,
      'maquinaria.editar': false,
      'notificaciones.email': false,
      'catalogo.analitos.ver': false,
      'catalogo.analitos.crear': false,
      'catalogo.analitos.editar': false,
      'catalogo.analitos.eliminar': false,
      'catalogo.categorias.ver': false,
      'catalogo.categorias.crear': false,
      'catalogo.categorias.editar': false,
      'catalogo.categorias.eliminar': false
    }
  }
]


