# Comandos a Ejecutar - Plan de Implementación

## ⚠️ Requisito Previo
Asegúrate de que Node.js esté instalado y disponible en el PATH.
- Verificar: `node --version` y `npm --version`
- Si no funciona, instala Node.js desde: https://nodejs.org/

## 📋 Comandos en Orden de Ejecución

### 1. Instalar Dependencias
```powershell
cd "C:\Users\Salvador Barba (TD)\Desktop\App lab"
npm install
```

### 2. Generar Cliente Prisma
```powershell
npm run db:generate
```

### 3. Ejecutar Migraciones (Crear Tablas en Base de Datos)
```powershell
npm run db:migrate
```
**Nota:** Cuando te pregunte el nombre de la migración, puedes usar: `init` o simplemente presionar Enter.

### 4. Crear Usuario Administrador Inicial
```powershell
node scripts/create-admin.js
```

Este script creará:
- ✅ Sucursal Principal
- ✅ Usuario administrador (admin@laboratorio.com / admin123)
- ✅ Tipos de prueba básicos
- ✅ Maquinaria de ejemplo

### 5. Iniciar Servidor de Desarrollo
```powershell
npm run dev
```

Luego abre tu navegador en: **http://localhost:3000**

## 🔐 Credenciales de Acceso

Después de ejecutar el script de creación:
- **Email:** admin@laboratorio.com
- **Contraseña:** admin123
- **Rol:** SUPER_ADMIN

## ✅ Verificación

Después de ejecutar las migraciones, verifica en pgAdmin 4:
1. Expandir: Laboratorio Local → Databases → laboratorio_comandas → Schemas → public → Tables
2. Deberías ver las tablas: Usuario, Sucursal, Cliente, Comanda, TipoPrueba, Maquinaria, Resultado, Mensaje

## 🚨 Solución de Problemas

### Si npm no se reconoce:
- Instala Node.js desde https://nodejs.org/
- Reinicia PowerShell después de la instalación
- Verifica con: `node --version`

### Si hay errores de conexión a PostgreSQL:
- Verifica que PostgreSQL esté ejecutándose
- Verifica el archivo `.env.local` y la variable `DATABASE_URL`
- Asegúrate de que la base de datos `laboratorio_comandas` existe

### Si las migraciones fallan:
- Verifica que la base de datos existe en pgAdmin 4
- Verifica las credenciales en `.env.local`
- Asegúrate de que PostgreSQL esté ejecutándose








