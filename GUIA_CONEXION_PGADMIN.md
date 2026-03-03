# 🔌 Guía: Conectar PostgreSQL con pgAdmin 4

## 📋 Requisitos Previos

- ✅ PostgreSQL instalado y corriendo
- ✅ pgAdmin 4 instalado
- ✅ Conocer los datos de conexión de tu base de datos

---

## 🔍 Paso 1: Obtener los Datos de Conexión

Primero, necesitas obtener la información de tu `DATABASE_URL` del archivo `.env.local` o `.env`.

El formato típico es:
```
postgresql://usuario:password@localhost:5432/nombre_base_datos
```

**Ejemplo del proyecto:**
```
postgresql://postgres:postgres@localhost:5432/laboratorio_comandas
```

**Desglose:**
- **Usuario**: `postgres` (o el que hayas configurado)
- **Contraseña**: `postgres` (o la que hayas configurado)
- **Host**: `localhost` (o la IP del servidor)
- **Puerto**: `5432` (puerto por defecto de PostgreSQL)
- **Base de datos**: `laboratorio_comandas` (o el nombre que uses)

---

## 🚀 Paso 2: Abrir pgAdmin 4

1. Abre **pgAdmin 4** desde el menú de inicio o desde el escritorio
2. Si es la primera vez, te pedirá establecer una contraseña maestra para pgAdmin (guárdala bien)

---

## ➕ Paso 3: Crear Nueva Conexión (Server)

1. En el panel izquierdo, haz clic derecho en **"Servers"**
2. Selecciona **"Create"** → **"Server..."**

   ![Crear servidor](https://i.imgur.com/placeholder.png)

---

## 📝 Paso 4: Configurar la Conexión

### Pestaña "General"

1. **Name**: Pon un nombre descriptivo (ej: `Laboratorio Comandas` o `PostgreSQL Local`)
2. **Server group**: Déjalo en `Servers` (por defecto)
3. **Comments**: (Opcional) Puedes agregar una descripción

### Pestaña "Connection"

Completa los siguientes campos:

| Campo | Valor | Descripción |
|-------|-------|-------------|
| **Host name/address** | `localhost` | Si está en tu máquina local |
| **Port** | `5432` | Puerto por defecto de PostgreSQL |
| **Maintenance database** | `postgres` | Base de datos por defecto |
| **Username** | `postgres` | Tu usuario de PostgreSQL |
| **Password** | `[tu contraseña]` | Tu contraseña de PostgreSQL |

**⚠️ IMPORTANTE:**
- ✅ Marca la casilla **"Save password"** si quieres que pgAdmin recuerde tu contraseña
- ⚠️ Si no la marcas, tendrás que ingresarla cada vez que conectes

### Pestaña "Advanced" (Opcional)

- **DB restriction**: Puedes dejar vacío o especificar el nombre de la base de datos si solo quieres ver una

### Pestaña "SSL" (Opcional)

- Para desarrollo local, generalmente no necesitas SSL
- Si estás en producción, configura según tus necesidades

---

## ✅ Paso 5: Guardar y Conectar

1. Haz clic en **"Save"** para guardar la configuración
2. pgAdmin intentará conectarse automáticamente
3. Si todo está correcto, verás el servidor en el panel izquierdo con un ícono de servidor conectado (verde)

---

## 🔍 Paso 6: Verificar la Conexión

Una vez conectado, deberías ver:

```
Servers
  └── 📊 Laboratorio Comandas (o el nombre que pusiste)
      ├── 📁 Databases
      │   └── 📁 laboratorio_comandas
      │       ├── 📁 Schemas
      │       │   └── 📁 public
      │       │       ├── 📁 Tables
      │       │       ├── 📁 Views
      │       │       └── ...
      ├── 📁 Login/Group Roles
      └── 📁 Tablespaces
```

---

## 🛠️ Solución de Problemas Comunes

### ❌ Error: "Could not connect to server"

**Posibles causas y soluciones:**

1. **PostgreSQL no está corriendo**
   ```powershell
   # Verificar si el servicio está corriendo
   Get-Service postgresql*
   
   # Si no está corriendo, iniciarlo
   Start-Service postgresql-x64-14  # Ajusta la versión según tu instalación
   ```

2. **Puerto incorrecto**
   - Verifica que PostgreSQL esté escuchando en el puerto 5432
   - Puedes cambiarlo en `postgresql.conf` si es necesario

3. **Firewall bloqueando**
   - Asegúrate de que el firewall de Windows permita conexiones en el puerto 5432

### ❌ Error: "Password authentication failed"

**Solución:**
1. Verifica que la contraseña sea correcta
2. Si olvidaste la contraseña, puedes resetearla:
   ```powershell
   # Detener PostgreSQL
   Stop-Service postgresql-x64-14
   
   # Editar pg_hba.conf y cambiar "md5" a "trust" temporalmente
   # Luego reiniciar y cambiar la contraseña
   ```

### ❌ Error: "Database does not exist"

**Solución:**
1. Verifica que la base de datos exista
2. Puedes crearla desde pgAdmin:
   - Click derecho en "Databases" → "Create" → "Database..."
   - Nombre: `laboratorio_comandas`
   - Owner: `postgres`

### ❌ Error: "Connection refused"

**Solución:**
1. Verifica que PostgreSQL esté escuchando en `localhost`
2. Revisa el archivo `postgresql.conf`:
   ```
   listen_addresses = 'localhost'  # o '*' para todas las interfaces
   ```

---

## 📊 Paso 7: Explorar la Base de Datos

Una vez conectado, puedes:

1. **Ver tablas**: Expande `Databases` → `laboratorio_comandas` → `Schemas` → `public` → `Tables`
2. **Ver datos**: Click derecho en una tabla → "View/Edit Data" → "All Rows"
3. **Ejecutar queries**: Click en el ícono de SQL (🔍) en la barra superior
4. **Ver estructura**: Click derecho en tabla → "Properties"

---

## 🔐 Paso 8: Configuración de Seguridad (Recomendado)

Para producción, considera:

1. **Cambiar contraseña por defecto**:
   ```sql
   ALTER USER postgres WITH PASSWORD 'nueva_contraseña_segura';
   ```

2. **Crear usuario específico para la app**:
   ```sql
   CREATE USER app_user WITH PASSWORD 'contraseña_app';
   GRANT ALL PRIVILEGES ON DATABASE laboratorio_comandas TO app_user;
   ```

3. **Actualizar DATABASE_URL** en tu `.env.local`:
   ```
   DATABASE_URL="postgresql://app_user:contraseña_app@localhost:5432/laboratorio_comandas"
   ```

---

## 📝 Ejemplo de Configuración Completa

### Para Desarrollo Local:

**pgAdmin 4 - Configuración:**
- **Name**: `PostgreSQL Local`
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `postgres` (para conexión inicial)
- **Username**: `postgres`
- **Password**: `postgres` (o la que configuraste)

### Para Producción:

**pgAdmin 4 - Configuración:**
- **Name**: `Producción - Servidor Remoto`
- **Host**: `192.168.1.100` (IP del servidor)
- **Port**: `5432`
- **Database**: `postgres`
- **Username**: `app_user`
- **Password**: `[contraseña segura]`
- **SSL Mode**: `Require`

---

## 🎯 Verificación Rápida

Para verificar que todo funciona:

1. **Conecta desde pgAdmin** ✅
2. **Ejecuta una query simple**:
   ```sql
   SELECT version();
   ```
   Deberías ver la versión de PostgreSQL

3. **Lista las bases de datos**:
   ```sql
   SELECT datname FROM pg_database;
   ```
   Deberías ver `laboratorio_comandas` en la lista

---

## 💡 Tips Adicionales

1. **Guardar conexiones favoritas**: Puedes crear múltiples conexiones para diferentes entornos (desarrollo, producción, etc.)

2. **Query Tool**: Usa el Query Tool (🔍) para ejecutar comandos SQL directamente

3. **Backup desde pgAdmin**:
   - Click derecho en la base de datos → "Backup..."
   - Selecciona formato y ubicación
   - Click en "Backup"

4. **Restore desde pgAdmin**:
   - Click derecho en la base de datos → "Restore..."
   - Selecciona el archivo de backup
   - Click en "Restore"

---

## 📞 ¿Necesitas Ayuda?

Si después de seguir estos pasos aún tienes problemas:

1. Verifica que PostgreSQL esté corriendo
2. Revisa los logs de PostgreSQL (generalmente en `C:\Program Files\PostgreSQL\[versión]\data\log\`)
3. Verifica la configuración de `pg_hba.conf` para autenticación
4. Asegúrate de que el puerto 5432 no esté siendo usado por otra aplicación

---

**¡Listo!** Ya deberías tener pgAdmin 4 conectado a tu base de datos PostgreSQL. 🎉









