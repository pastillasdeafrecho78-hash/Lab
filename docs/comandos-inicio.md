## Puesta en Marcha del Proyecto

### Requisitos Previos
- Node.js 20.x (incluye npm)
- PostgreSQL en localhost (puerto 5432) con la base `laboratorio_comandas`
- Archivo `.env.local` con `DATABASE_URL="postgresql://usuario:password@localhost:5432/laboratorio_comandas?schema=public"`

### Pasos de Arranque
1. **Instalar dependencias**
   ```bash
   npm install
   ```
2. **Sincronizar base de datos**
   ```bash
   $env:DATABASE_URL = (Get-Content ".env.local" | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object { $_.Substring($_.IndexOf('=') + 1).Trim('\"') })
   npx prisma db push --skip-generate
   ```
   > Si el esquema cambia y hay riesgo de datos duplicados, añadir `--accept-data-loss`.
3. **Regenerar cliente de Prisma**
   ```bash
   npx prisma generate
   ```
4. **Levantar el servidor de desarrollo**
   ```bash
   $env:DATABASE_URL = (Get-Content ".env.local" | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object { $_.Substring($_.IndexOf('=') + 1).Trim('\"') })
   npm run dev
   ```
5. **Scripts útiles**
   - Crear administrador por defecto:
     ```bash
     node scripts/create-admin.js
     ```
   - Cargar catálogo clínico (analitos y categorías):
     ```bash
     $env:DATABASE_URL = (Get-Content ".env.local" | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object { $_.Substring($_.IndexOf('=') + 1).Trim('\"') })
     npm run seed:catalogo
     ```
     > Este script crea analitos estándar (Glucosa, Colesterol, etc.), categorías predefinidas (Química 6, Hematología Completa, etc.) y migra tipos de prueba existentes al nuevo modelo.
   - Semillas adicionales (backend Nest/Prisma):
     ```bash
     npm run ts-node backend/src/scripts/seed.ts
     ```

### Solución de Problemas
- **Error EPERM al regenerar Prisma**: detener procesos `node` (por ejemplo `Get-Process node | Stop-Process`) y volver a ejecutar `npx prisma generate`.
- **Errores 401 en login**: asegurarse de ejecutar `syncPermissionsCatalog` vía login después de regenerar Prisma y sincronizar la base.

---
_Última actualización: 11/11/2025_




