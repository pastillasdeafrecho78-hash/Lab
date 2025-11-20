# Guía de Implementación - Sistema de Comandas para Laboratorios

## 📋 Índice
1. [Configurar Base de Datos PostgreSQL](#1-configurar-base-de-datos-postgresql)
2. [Crear Usuario Administrador Inicial](#2-crear-usuario-administrador-inicial)
3. [Configurar Información del Laboratorio](#3-configurar-información-del-laboratorio)
4. [Probar Todas las Funcionalidades](#4-probar-todas-las-funcionalidades)
5. [Preparar para Promoción en Instagram](#5-preparar-para-promoción-en-instagram)

---

## 1. Configurar Base de Datos PostgreSQL

### 1.1 Instalar PostgreSQL en Windows

#### Descarga e Instalación:
1. **Descargar PostgreSQL:**
   - Ir a: https://www.postgresql.org/download/windows/
   - Descargar la versión más reciente (recomendado: PostgreSQL 15 o superior)
   - Ejecutar el archivo `.exe` descargado

2. **Proceso de Instalación:**
   - Seleccionar "Next" en la pantalla de bienvenida
   - Elegir directorio de instalación (recomendado: mantener el predeterminado)
   - Seleccionar componentes (mantener todos seleccionados)
   - Elegir directorio de datos (mantener el predeterminado)
   - **IMPORTANTE:** Configurar contraseña para el usuario `postgres` (¡recuerda esta contraseña!)
   - Seleccionar puerto (por defecto: 5432)
   - Elegir configuración regional (mantener predeterminada)
   - Instalar pgAdmin (recomendado para gestión visual)
   - Finalizar instalación

3. **Verificar Instalación:**
   - Abrir **Símbolo del sistema** como administrador
   - Ejecutar: `psql --version`
   - Si aparece la versión, PostgreSQL está instalado correctamente

#### Configuración Post-Instalación:
```cmd
# Abrir Símbolo del sistema como administrador
# Navegar al directorio de PostgreSQL (generalmente):
cd "C:\Program Files\PostgreSQL\18\bin"

# Iniciar servicio PostgreSQL
pg_ctl start -D "C:\Program Files\PostgreSQL\18\data"
```

### 1.2 Crear Base de Datos usando pgAdmin 4 (Recomendado)

#### Paso 1: Conectar a PostgreSQL con pgAdmin
1. **Abrir pgAdmin 4:**
   - Buscar "pgAdmin 4" en el menú de inicio de Windows
   - Hacer clic para abrir la aplicación

2. **Conectar al servidor PostgreSQL:**
   - En el panel izquierdo, hacer clic derecho en "Servers"
   - Seleccionar "Create" → "Server..."
   - En la pestaña "General":
     - **Name:** "Laboratorio Local"
   - En la pestaña "Connection":
     - **Host name/address:** localhost
     - **Port:** 5432
     - **Username:** postgres
     - **Password:** postgres
   - Hacer clic en "Save"

#### Paso 2: Crear la Base de Datos
1. **Expandir el servidor "Laboratorio Local"**
2. **Hacer clic derecho en "Databases"**
3. **Seleccionar "Create" → "Database..."**
4. **En la ventana que aparece:**
   - **Database:** laboratorio_comandas
   - **Owner:** postgres
   - **Encoding:** UTF8
   - **Collation:** Spanish_Spain.1252 (o la que prefieras)
5. **Hacer clic en "Save"**

#### Paso 3: Verificar la Conexión
1. **Expandir "Databases"**
2. **Expandir "laboratorio_comandas"**
3. **Expandir "Schemas"**
4. **Expandir "public"**
5. **Si puedes ver "Tables", "Views", etc., la conexión es exitosa**

#### Solución de Problemas Comunes:
- **Si no puedes conectar:** Intenta con contraseña vacía (solo presionar Enter)
- **Si aparece error de autenticación:** Verifica que PostgreSQL esté ejecutándose
- **Si no aparece pgAdmin:** Reinstala PostgreSQL asegurándote de marcar "pgAdmin 4"

### 1.3 Configurar Variables de Entorno

#### Paso 1: Crear Archivo .env.local
1. **Navegar al directorio del proyecto:**
   ```powershell
   cd "C:\Users\Salvador Barba (TD)\Desktop\App lab"
   ```

2. **Crear archivo `.env.local`:**
   - Hacer clic derecho en el explorador de archivos
   - Seleccionar "Nuevo" → "Documento de texto"
   - Renombrar el archivo de `Nuevo documento de texto.txt` a `.env.local`
   - **Importante:** Asegúrate de que el archivo se llame exactamente `.env.local` (con el punto al inicio)

#### Paso 2: Configurar Variables de Entorno
Abrir el archivo `.env.local` con cualquier editor de texto y agregar el siguiente contenido:

```env
# ===========================================
# CONFIGURACIÓN DE BASE DE DATOS
# ===========================================
# URL de conexión a PostgreSQL
# Formato: postgresql://usuario:contraseña@host:puerto/nombre_base_datos
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/laboratorio_comandas"

# ===========================================
# CONFIGURACIÓN DE AUTENTICACIÓN JWT
# ===========================================
# Clave secreta para firmar tokens JWT (mínimo 32 caracteres)
# Generar una clave segura: https://generate-secret.vercel.app/32
JWT_SECRET="mi_clave_super_secreta_para_jwt_minimo_32_caracteres_12345"

# ===========================================
# CONFIGURACIÓN DE NEXTAUTH
# ===========================================
# URL base de la aplicación
NEXTAUTH_URL="http://localhost:3000"

# Clave secreta para NextAuth (diferente a JWT_SECRET)
# Generar una clave segura: https://generate-secret.vercel.app/32
NEXTAUTH_SECRET="mi_clave_super_secreta_para_nextauth_minimo_32_caracteres_67890"

# ===========================================
# CONFIGURACIÓN DE SOCKET.IO
# ===========================================
# Puerto para el servidor de Socket.IO (chat en tiempo real)
SOCKET_PORT=3001

# ===========================================
# CONFIGURACIÓN DE EMAIL (OPCIONAL)
# ===========================================
# Configuración para envío de emails desde el sistema (para notificaciones futuras)
# NOTA: Esta configuración es para el ADMINISTRADOR del sistema, NO para los usuarios finales
# El sistema usará estas credenciales para enviar emails automáticamente a los usuarios
# Usa una cuenta de email del laboratorio (ej: notificaciones@tulaboratorio.com)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu_email@gmail.com"
SMTP_PASS="tu_password_de_aplicacion"

# ===========================================
# CONFIGURACIÓN DE ARCHIVOS
# ===========================================
# Directorio para subir archivos
UPLOAD_DIR="./uploads"

# Tamaño máximo de archivo (en bytes)
# 10485760 = 10MB
MAX_FILE_SIZE=10485760

# ===========================================
# CONFIGURACIÓN DE DESARROLLO
# ===========================================
# Modo de desarrollo (true para desarrollo, false para producción)
NODE_ENV="development"

# Puerto del servidor de desarrollo
PORT=3000
```

#### Paso 3: Personalizar las Variables
**IMPORTANTE:** Debes cambiar los siguientes valores:

1. **DATABASE_URL:** 
   - Si configuraste contraseña para postgres, agrégala: `postgresql://postgres:TU_CONTRASEÑA@localhost:5432/laboratorio_comandas`
   - Si no configuraste contraseña, déjalo como está

2. **JWT_SECRET y NEXTAUTH_SECRET:**
   - Generar claves seguras en: https://generate-secret.vercel.app/32
   - O usar cualquier texto de al menos 32 caracteres

3. **SMTP_USER y SMTP_PASS (opcional):**
   - Solo si planeas usar notificaciones por email
   - Esta es la cuenta de email del LABORATORIO (no de los usuarios)
   - El sistema usará esta cuenta para enviar emails automáticamente
   - Usar contraseña de aplicación de Gmail (no tu contraseña personal)

#### Paso 4: Verificar Archivo
1. **Asegúrate de que el archivo se guardó correctamente**
2. **Verifica que no hay espacios extra o caracteres especiales**
3. **El archivo debe estar en la raíz del proyecto:** `C:\Users\Salvador Barba (TD)\Desktop\App lab\.env.local`

#### Solución de Problemas Comunes:

**Error: "No se encuentra el archivo .env.local"**
- Verificar que el archivo esté en la raíz del proyecto
- Verificar que el nombre sea exactamente `.env.local` (con punto)

**Error: "Variables de entorno no cargadas"**
- Reiniciar el servidor de desarrollo: `npm run dev`
- Verificar que no hay espacios alrededor del signo `=`

**Error: "DATABASE_URL no válida"**
- Verificar formato: `postgresql://usuario:contraseña@host:puerto/base_datos`
- Verificar que la base de datos existe en pgAdmin

#### Paso 5: Generar Claves Seguras (Recomendado)

**Para JWT_SECRET y NEXTAUTH_SECRET:**

1. **Opción 1 - Generador Online:**
   - Ir a: https://generate-secret.vercel.app/32
   - Copiar la clave generada
   - Pegar en el archivo `.env.local`

2. **Opción 2 - PowerShell:**
   ```powershell
   # Generar clave aleatoria de 32 caracteres
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
   ```

3. **Opción 3 - Manual:**
   - Usar cualquier texto de al menos 32 caracteres
   - Ejemplo: `mi_laboratorio_secreto_2024_muy_seguro_123456789`

#### Paso 6: Verificar Configuración Completa

**Checklist de verificación:**
- [ ] Archivo `.env.local` creado en la raíz del proyecto
- [ ] DATABASE_URL configurada correctamente
- [ ] JWT_SECRET configurado (mínimo 32 caracteres)
- [ ] NEXTAUTH_SECRET configurado (mínimo 32 caracteres)
- [ ] NEXTAUTH_URL configurada como `http://localhost:3000`
- [ ] SOCKET_PORT configurado como `3001`
- [ ] Archivo guardado sin errores de sintaxis

**Comando para verificar que el archivo existe:**
```powershell
# En PowerShell, desde el directorio del proyecto
Test-Path ".env.local"
# Debería devolver: True
```

### 1.4 Ejecutar Migraciones usando pgAdmin 4

**IMPORTANTE:** Antes de ejecutar las migraciones, asegúrate de haber completado la sección 1.3 (Configurar Variables de Entorno) y tener el archivo `.env.local` configurado correctamente.

#### Paso 1: Preparar el Proyecto
1. **Abrir PowerShell en el directorio del proyecto:**
   - Navegar a: `C:\Users\Salvador Barba (TD)\Desktop\App lab`
   - O usar: `cd "C:\Users\Salvador Barba (TD)\Desktop\App lab"`

2. **Verificar que el archivo .env.local existe:**
   ```powershell
   Test-Path ".env.local"
   # Debería devolver: True
   ```

3. **Instalar dependencias:**
   ```powershell
   npm install
   ```

#### Paso 2: Verificar Configuración de Base de Datos
1. **Abrir pgAdmin 4**
2. **Verificar que puedes conectarte al servidor "Laboratorio Local"**
3. **Verificar que existe la base de datos "laboratorio_comandas"**
4. **Si no existe la base de datos, crearla siguiendo los pasos de la sección 1.2**

#### Paso 3: Ejecutar Migraciones
```powershell
# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones (crear las tablas)
npm run db:migrate
```

#### Paso 4: Verificar en pgAdmin 4
1. **Abrir pgAdmin 4**
2. **Expandir:** Laboratorio Local → Databases → laboratorio_comandas → Schemas → public → Tables
3. **Deberías ver las tablas creadas:** Usuario, Sucursal, Cliente, Comanda, TipoPrueba, Maquinaria, Resultado, Mensaje

#### Paso 5: Iniciar la Aplicación
```powershell
# Iniciar el servidor de desarrollo
npm run dev
```

#### Paso 6: Verificar que todo funciona
- **Abrir navegador** y ir a: http://localhost:3000
- **Deberías ver la página de login** del sistema
- **Si aparece error:** Verificar que el archivo `.env.local` esté configurado correctamente

---

## 2. Crear Usuario Administrador Inicial

### 2.1 Script de Creación de Usuario Admin

Crear archivo `scripts/create-admin.js`:

```javascript
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Crear sucursal principal
    const sucursal = await prisma.sucursal.create({
      data: {
        nombre: 'Sucursal Principal',
        direccion: 'Dirección de tu laboratorio',
        telefono: 'Tu teléfono',
        email: 'tu_email@laboratorio.com'
      }
    })

    console.log('✅ Sucursal creada:', sucursal.nombre)

    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const admin = await prisma.usuario.create({
      data: {
        email: 'admin@laboratorio.com',
        nombre: 'Administrador',
        apellido: 'Sistema',
        password: hashedPassword,
        rol: 'SUPER_ADMIN'
      }
    })

    // Asignar usuario a sucursal
    await prisma.usuarioSucursal.create({
      data: {
        usuarioId: admin.id,
        sucursalId: sucursal.id
      }
    })

    console.log('✅ Usuario administrador creado:')
    console.log('   Email: admin@laboratorio.com')
    console.log('   Contraseña: admin123')
    console.log('   Rol: SUPER_ADMIN')

    // Crear tipos de prueba básicos
    const tiposPrueba = [
      {
        nombre: 'Química Completa 6',
        descripcion: 'Perfil químico completo con 6 elementos',
        elementos: ['glucosa', 'colesterol_total', 'trigliceridos', 'hdl_colesterol', 'ldl_colesterol', 'hemoglobina_glicosilada']
      },
      {
        nombre: 'Química Básica 3',
        descripcion: 'Perfil químico básico con 3 elementos',
        elementos: ['glucosa', 'colesterol_total', 'trigliceridos']
      },
      {
        nombre: 'Hematología Completa',
        descripcion: 'Conteo sanguíneo completo',
        elementos: ['hemoglobina', 'hematocrito', 'leucocitos', 'neutrofilos', 'linfocitos', 'monocitos', 'eosinofilos', 'basofilos', 'plaquetas']
      }
    ]

    for (const tipo of tiposPrueba) {
      await prisma.tipoPrueba.create({
        data: tipo
      })
    }

    console.log('✅ Tipos de prueba creados')

    // Crear maquinaria de ejemplo
    const maquinaria = await prisma.maquinaria.create({
      data: {
        nombre: 'Analizador Químico Principal',
        modelo: 'Modelo XYZ',
        marca: 'Marca ABC',
        serie: 'SN123456',
        sucursalId: sucursal.id
      }
    })

    console.log('✅ Maquinaria creada:', maquinaria.nombre)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
```

### 2.2 Ejecutar Script usando pgAdmin 4

#### Paso 1: Preparar el Script
1. **Asegúrate de estar en el directorio del proyecto:**
   ```powershell
   cd "C:\Users\Salvador Barba (TD)\Desktop\App lab"
   ```

2. **Instalar dependencias si no están instaladas:**
   ```powershell
   npm install
   ```

#### Paso 2: Ejecutar Script de Creación
```powershell
# Ejecutar script para crear usuario administrador
node scripts/create-admin.js
```

#### Paso 3: Verificar en pgAdmin 4
1. **Abrir pgAdmin 4**
2. **Expandir:** Laboratorio Local → Databases → laboratorio_comandas → Schemas → public → Tables
3. **Hacer clic derecho en la tabla "Usuario" → "View/Edit Data" → "All Rows"**
4. **Deberías ver el usuario administrador creado:**
   - Email: admin@laboratorio.com
   - Rol: SUPER_ADMIN

#### Paso 4: Verificar Sucursal Creada
1. **En pgAdmin 4, hacer clic derecho en la tabla "Sucursal" → "View/Edit Data" → "All Rows"**
2. **Deberías ver la sucursal principal creada**

#### Si hay errores de permisos:
```powershell
# Ejecutar PowerShell como administrador
# Hacer clic derecho en PowerShell → "Ejecutar como administrador"
# Luego ejecutar los comandos anteriores
```

### 2.3 Verificar Creación usando pgAdmin 4

#### Paso 1: Verificar Datos en pgAdmin 4
1. **Abrir pgAdmin 4**
2. **Expandir:** Laboratorio Local → Databases → laboratorio_comandas → Schemas → public → Tables
3. **Verificar que existen las siguientes tablas:**
   - Usuario
   - Sucursal
   - Cliente
   - Comanda
   - TipoPrueba
   - Maquinaria
   - Resultado
   - Mensaje

#### Paso 2: Verificar Usuario Administrador
1. **Hacer clic derecho en la tabla "Usuario" → "View/Edit Data" → "All Rows"**
2. **Deberías ver:**
   - Email: admin@laboratorio.com
   - Nombre: Administrador
   - Apellido: Sistema
   - Rol: SUPER_ADMIN

#### Paso 3: Iniciar la Aplicación
```powershell
# En PowerShell
cd "C:\Users\Salvador Barba (TD)\Desktop\App lab"
npm run dev
```

#### Paso 4: Acceder al Sistema
1. **Abrir navegador** (Chrome, Firefox, Edge)
2. **Ir a:** http://localhost:3000
3. **Iniciar sesión con:**
   - **Email:** admin@laboratorio.com
   - **Contraseña:** admin123

#### Si no puedes acceder:
1. **Verificar en pgAdmin 4 que PostgreSQL esté ejecutándose**
2. **Verificar que las tablas se crearon correctamente**
3. **Verificar que el usuario administrador existe**
4. **Revisar la consola del navegador para errores**

---

## 3. Configurar Información del Laboratorio

### 3.1 Actualizar Información de Sucursales

1. **Acceder al Dashboard:**
   - Iniciar sesión como administrador
   - Ir a "Sucursales" en el menú

2. **Editar Sucursal Principal:**
   - Hacer clic en el ícono de editar
   - Actualizar:
     - Nombre del laboratorio
     - Dirección completa
     - Teléfono
     - Email

3. **Agregar Sucursales Adicionales:**
   - Hacer clic en "Nueva Sucursal"
   - Completar información de cada sucursal

### 3.2 Configurar Maquinaria

1. **Ir a "Maquinaria" en el menú**
2. **Agregar equipos:**
   - Nombre del equipo
   - Marca y modelo
   - Número de serie
   - Asignar a sucursal correspondiente

3. **Asignar pruebas a maquinaria:**
   - Hacer clic en cada equipo
   - Asignar tipos de prueba que puede realizar

### 3.3 Crear Usuarios del Personal

1. **Ir a "Usuarios" en el menú**
2. **Crear usuarios para cada rol:**
   - **Responsable Sanitario:** Acceso completo
   - **Responsable Sucursal:** Gestión de su sucursal
   - **Técnico Laboratorio:** Carga de resultados
   - **Recepción:** Registro de comandas

3. **Asignar a sucursales correspondientes**

### 3.4 Configurar Tipos de Prueba Personalizados

1. **Ir a configuración de tipos de prueba**
2. **Crear perfiles específicos:**
   - Perfil diabético
   - Perfil cardiovascular
   - Perfil tiroideo
   - Perfiles personalizados según necesidades

---

## 4. Probar Todas las Funcionalidades

### 4.1 Checklist de Pruebas

#### ✅ Autenticación y Usuarios
- [ ] Iniciar sesión con diferentes roles
- [ ] Verificar permisos por rol
- [ ] Crear nuevos usuarios
- [ ] Asignar usuarios a sucursales
- [ ] Cambiar contraseñas

#### ✅ Gestión de Sucursales
- [ ] Crear nueva sucursal
- [ ] Editar información de sucursal
- [ ] Asignar usuarios a sucursales
- [ ] Verificar acceso por sucursal

#### ✅ Gestión de Maquinaria
- [ ] Agregar nuevo equipo
- [ ] Asignar equipo a sucursal
- [ ] Asignar pruebas a equipos
- [ ] Editar información de equipos

#### ✅ Gestión de Comandas
- [ ] Crear nueva comanda
- [ ] Asignar comanda a sucursal
- [ ] Cambiar estado de comanda
- [ ] Ver historial de comandas
- [ ] Filtrar comandas por estado/sucursal

#### ✅ Gestión de Clientes
- [ ] Crear nuevo cliente
- [ ] Buscar clientes existentes
- [ ] Ver historial de comandas del cliente
- [ ] Editar información del cliente

#### ✅ Sistema de Resultados
- [ ] Cargar resultado individual
- [ ] Cargar resultados múltiples
- [ ] Verificar validación de rangos
- [ ] Editar resultados
- [ ] Eliminar resultados

#### ✅ Generación de PDFs
- [ ] Generar PDF de comanda
- [ ] Generar PDF de resultados
- [ ] Verificar formato y contenido
- [ ] Descargar PDFs

#### ✅ Sistema de Chat
- [ ] Enviar mensaje general
- [ ] Enviar mensaje por sucursal
- [ ] Enviar mensaje privado
- [ ] Ver indicadores de escritura
- [ ] Ver historial de mensajes

#### ✅ Auditoría y Seguridad
- [ ] Verificar logs de auditoría
- [ ] Probar acceso no autorizado
- [ ] Verificar trazabilidad de acciones
- [ ] Probar diferentes IPs/dispositivos

### 4.2 Datos de Prueba

#### Crear Cliente de Prueba:
```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan.perez@email.com",
  "telefono": "555-1234",
  "fechaNacimiento": "1985-06-15",
  "genero": "M",
  "direccion": "Calle Principal 123, Ciudad"
}
```

#### Crear Comanda de Prueba:
```json
{
  "clienteId": "id_del_cliente",
  "sucursalId": "id_de_la_sucursal",
  "tipoPruebaId": "id_del_tipo_prueba",
  "elementos": ["glucosa", "colesterol_total", "trigliceridos"],
  "observaciones": "Paciente en ayunas"
}
```

#### Resultados de Prueba:
```json
{
  "resultados": [
    {
      "elemento": "glucosa",
      "valor": 95,
      "unidad": "mg/dL",
      "rangoNormal": "70 - 100",
      "observaciones": "Valor normal"
    },
    {
      "elemento": "colesterol_total",
      "valor": 180,
      "unidad": "mg/dL",
      "rangoNormal": "0 - 200",
      "observaciones": "Valor normal"
    }
  ]
}
```

### 4.3 Casos de Uso Completos

#### Flujo Completo de Comanda:
1. **Recepción** crea comanda para cliente
2. **Sistema** asigna automáticamente a sucursal
3. **Técnico** cambia estado a "En Proceso"
4. **Técnico** carga resultados
5. **Sistema** marca comanda como "Completada"
6. **Responsable** genera PDF de resultados
7. **Recepción** entrega resultados al cliente

#### Flujo de Chat:
1. **Usuario** envía mensaje general
2. **Otros usuarios** reciben notificación
3. **Usuario** responde en tiempo real
4. **Sistema** mantiene historial

---

## 5. Preparar para Promoción en Instagram

### 5.1 Contenido para Redes Sociales

#### Posts para Instagram:

**Post 1 - Presentación:**
```
🧪 ¡Revolucionamos la gestión de laboratorios! 

Presentamos nuestro nuevo sistema de comandas digital que reemplaza WhatsApp con una solución profesional y eficiente.

✅ Gestión completa de comandas
✅ Chat interno entre sucursales  
✅ PDFs automáticos
✅ Seguimiento en tiempo real

¿Listo para modernizar tu laboratorio? 

#LaboratorioDigital #InnovacionMedica #GestionEficiente
```

**Post 2 - Beneficios:**
```
🚀 ¿Sabías que puedes reducir el tiempo de gestión de comandas en un 80%?

Nuestro sistema te permite:
• Crear comandas en segundos
• Asignar automáticamente a sucursales
• Generar PDFs profesionales
• Comunicarte con tu equipo en tiempo real

¡Di adiós a los grupos de WhatsApp! 

#Eficiencia #Productividad #LaboratorioClinico
```

**Post 3 - Testimonial:**
```
💬 "Antes perdíamos mucho tiempo coordinando por WhatsApp. Ahora todo está centralizado y es súper fácil de usar."

- Dr. María González, Laboratorio San Miguel

¿Quieres la misma experiencia? ¡Contáctanos!

#Testimonial #SatisfaccionCliente #LaboratorioModerno
```

### 5.2 Stories para Instagram:

**Story 1 - Demo del Sistema:**
- Mostrar pantalla de login
- Navegar por el dashboard
- Crear una comanda
- Mostrar generación de PDF

**Story 2 - Comparación:**
- "Antes: WhatsApp confuso"
- "Ahora: Sistema organizado"
- Mostrar diferencias visuales

**Story 3 - Beneficios:**
- "80% menos tiempo"
- "100% organizado"
- "0% confusión"

### 5.3 Hashtags Sugeridos:

```
#LaboratorioDigital
#InnovacionMedica
#GestionEficiente
#LaboratorioClinico
#TecnologiaMedica
#Productividad
#Eficiencia
#SistemaComandas
#LaboratorioModerno
#Digitalizacion
#SoftwareMedico
#Automatizacion
```

### 5.4 Estrategia de Contenido:

#### Semana 1: Presentación
- Post de lanzamiento
- Stories explicando el problema
- Video demo del sistema

#### Semana 2: Beneficios
- Posts sobre eficiencia
- Comparaciones antes/después
- Testimonials (reales o simulados)

#### Semana 3: Casos de Uso
- Diferentes tipos de laboratorios
- Múltiples sucursales
- Integración con equipos

#### Semana 4: Llamada a la Acción
- Ofertas especiales
- Demos gratuitas
- Contacto directo

### 5.5 Materiales Visuales Necesarios:

#### Screenshots del Sistema:
- Dashboard principal
- Creación de comanda
- Chat interno
- PDF generado
- Móvil responsive

#### Gráficos de Beneficios:
- "80% menos tiempo"
- "100% organizado"
- "0% confusión"
- Comparación antes/después

#### Videos:
- Demo de 30 segundos
- Tutorial de 2 minutos
- Testimonial de cliente

### 5.6 Métricas a Seguir:

#### Instagram:
- Alcance de posts
- Engagement rate
- Clics en enlaces
- Mensajes directos
- Seguidores nuevos

#### Sistema:
- Registros de demo
- Solicitudes de información
- Descargas de PDFs
- Usuarios activos

### 5.7 Contacto y Demos:

#### Preparar:
- Email de contacto: info@laboratoriocomandas.com
- WhatsApp Business: +52 XXX XXX XXXX
- Página de landing con demo
- Formulario de contacto

#### Proceso de Demo:
1. **Interés inicial** (Instagram/WhatsApp)
2. **Agendar demo** (15-30 minutos)
3. **Mostrar sistema** en vivo
4. **Resolver dudas**
5. **Oferta personalizada**
6. **Seguimiento**

### 5.8 Ofertas Especiales:

#### Para Lanzamiento:
- **30% descuento** en el primer mes
- **Demo gratuita** de 7 días
- **Setup incluido** sin costo adicional
- **Capacitación gratuita** del personal

#### Para Referidos:
- **1 mes gratis** por cada referido
- **Descuento permanente** del 10%
- **Soporte prioritario**

---

## 🎯 Próximos Pasos Inmediatos:

1. **Hoy:** Configurar PostgreSQL y crear usuario admin
2. **Mañana:** Configurar información del laboratorio
3. **Esta semana:** Probar todas las funcionalidades
4. **Próxima semana:** Crear contenido para Instagram
5. **En 2 semanas:** Lanzar campaña en redes sociales

---

## 📞 Soporte y Contacto:

- **Email técnico:** soporte@laboratoriocomandas.com
- **WhatsApp:** +52 XXX XXX XXXX
- **Horario:** Lunes a Viernes 9:00 - 18:00

¡Tu laboratorio está listo para la revolución digital! 🚀

---

## 🔧 Comandos Útiles para Windows

### Servicios de Windows:
```cmd
# Ver servicios de PostgreSQL
services.msc

# Iniciar PostgreSQL
net start postgresql-x64-15

# Detener PostgreSQL
net stop postgresql-x64-15

# Reiniciar PostgreSQL
net stop postgresql-x64-15 && net start postgresql-x64-15
```

### Gestión de Procesos:
```cmd
# Ver procesos de Node.js
tasklist | findstr node

# Terminar proceso específico
taskkill /PID [número_del_proceso] /F

# Ver puertos en uso
netstat -ano | findstr :3000
netstat -ano | findstr :5432
```

### Navegación de Directorios:
```cmd
# Ir al directorio del proyecto
cd /d "C:\Users\Salvador Barba (TD)\Desktop\App lab"

# Ver contenido del directorio
dir

# Crear directorio
mkdir nombre_directorio

# Eliminar archivo
del nombre_archivo
```

### PowerShell Específico:
```powershell
# Ejecutar como administrador
Start-Process powershell -Verb runAs

# Ver variables de entorno
$env:PATH

# Instalar dependencias globales
npm install -g nodemon

# Verificar versiones
node --version
npm --version
psql --version
```

## 🚨 Troubleshooting Común en Windows

### Error: "No se puede conectar a PostgreSQL desde pgAdmin"
**Solución:**
1. **Verificar que PostgreSQL esté ejecutándose:**
   - Abrir "Servicios" (services.msc)
   - Buscar "postgresql-x64-18" y verificar que esté "Ejecutándose"
   - Si no está ejecutándose, hacer clic derecho → "Iniciar"

2. **Probar diferentes contraseñas:**
   - Primero intentar contraseña vacía (solo presionar Enter)
   - Luego intentar "postgres"
   - Finalmente intentar la contraseña que configuraste durante la instalación

3. **Verificar configuración de pg_hba.conf:**
   - Abrir archivo: `C:\Program Files\PostgreSQL\18\data\pg_hba.conf`
   - Buscar línea: `host    all             all             127.0.0.1/32            md5`
   - Si dice `md5`, cambiar temporalmente a `trust`
   - Reiniciar servicio PostgreSQL
   - Intentar conectar desde pgAdmin
   - Cambiar de vuelta a `md5` después de conectar

### Error: "psql no se reconoce como comando"
**Solución:**
1. Agregar PostgreSQL al PATH del sistema
2. Ir a: Panel de Control → Sistema → Configuración avanzada del sistema → Variables de entorno
3. En "Variables del sistema", buscar "Path" y hacer clic en "Editar"
4. Agregar: `C:\Program Files\PostgreSQL\18\bin`
5. Reiniciar PowerShell/Símbolo del sistema

### Error: "Puerto 3000 ya está en uso"
**Solución:**
```cmd
# Encontrar proceso que usa el puerto
netstat -ano | findstr :3000

# Terminar proceso
taskkill /PID [número_del_proceso] /F

# O usar puerto diferente
npm run dev -- --port 3001
```

### Error: "No se puede conectar a PostgreSQL"
**Solución:**
1. Verificar que el servicio esté ejecutándose
2. Verificar credenciales en `.env.local`
3. Verificar que el puerto 5432 esté disponible
4. Reiniciar servicio de PostgreSQL

### Error: "Permisos denegados"
**Solución:**
1. Ejecutar PowerShell como administrador
2. Ejecutar: `Set-ExecutionPolicy RemoteSigned`
3. Confirmar con "Y"

### Error: "npm install falla"
**Solución:**
```cmd
# Limpiar caché de npm
npm cache clean --force

# Eliminar node_modules y reinstalar
rmdir /s node_modules
del package-lock.json
npm install
```

### Error: "Prisma no puede conectar a la base de datos"
**Solución:**
1. **Verificar en pgAdmin 4:**
   - Abrir pgAdmin 4
   - Expandir: Laboratorio Local → Databases
   - Verificar que existe "laboratorio_comandas"
   - Hacer clic derecho en la base de datos → "Properties" para verificar configuración

2. **Verificar la URL de conexión en `.env.local`:**
   ```env
   DATABASE_URL="postgresql://postgres:@localhost:5432/laboratorio_comandas"
   ```

3. **Verificar que las tablas existen:**
   - En pgAdmin 4, expandir: laboratorio_comandas → Schemas → public → Tables
   - Deberías ver todas las tablas del sistema

4. **Ejecutar migraciones si faltan tablas:**
   ```powershell
   npm run db:migrate
   ```

## 📊 Verificación de Base de Datos con pgAdmin 4

### Cómo Verificar que Todo Está Funcionando:

#### 1. Verificar Conexión:
- Abrir pgAdmin 4
- Expandir "Servers" → "Laboratorio Local"
- Si puedes ver "Databases", la conexión es exitosa

#### 2. Verificar Base de Datos:
- Expandir "Databases" → "laboratorio_comandas"
- Deberías ver "Schemas" → "public"

#### 3. Verificar Tablas:
- Expandir "Schemas" → "public" → "Tables"
- Deberías ver: Usuario, Sucursal, Cliente, Comanda, TipoPrueba, Maquinaria, Resultado, Mensaje

#### 4. Verificar Datos:
- Hacer clic derecho en tabla "Usuario" → "View/Edit Data" → "All Rows"
- Deberías ver el usuario administrador
- Repetir para otras tablas según sea necesario

#### 5. Verificar Índices y Relaciones:
- Hacer clic derecho en cualquier tabla → "Properties"
- Verificar que las relaciones están configuradas correctamente

## 📱 Acceso Móvil en Windows

### Para probar en dispositivos móviles desde la misma red:
1. **Encontrar IP de tu computadora:**
   ```cmd
   ipconfig
   # Buscar "Dirección IPv4" de tu adaptador de red
   ```

2. **Modificar `.env.local`:**
   ```env
   NEXTAUTH_URL="http://[TU_IP]:3000"
   ```

3. **Acceder desde móvil:**
   - Abrir navegador en móvil
   - Ir a: `http://[TU_IP]:3000`
   - Ejemplo: `http://192.168.1.100:3000`

## 🔒 Configuración de Firewall

### Permitir aplicación a través del firewall:
1. **Abrir Windows Defender Firewall**
2. **Hacer clic en "Permitir una aplicación o característica"**
3. **Buscar "Node.js" y marcar "Privada" y "Pública"**
4. **Si no aparece, hacer clic en "Cambiar configuración" → "Permitir otra aplicación"**

## 💾 Backup y Restauración

### Backup de la base de datos:
```cmd
# Crear backup
pg_dump -U postgres -h localhost laboratorio_comandas > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U postgres -h localhost laboratorio_comandas < backup_20231201.sql
```

### Backup de archivos del proyecto:
```cmd
# Crear copia de seguridad
xcopy "C:\Users\Salvador Barba (TD)\Desktop\App lab" "C:\Backup\App lab" /E /I /H /Y
```
