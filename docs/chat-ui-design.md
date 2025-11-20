# Diseño UI Chat - Estilo Discord

## Estructura General

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER (Barra superior)                                        │
│  [←] Chat Laboratorio                    [Usuario] [Config]     │
└─────────────────────────────────────────────────────────────────┘
┌──────────┬──────────────────┬──────────────────┬──────────────┐
│          │                  │                  │              │
│ CANALES  │  LISTA CANALES   │   ÁREA CHAT      │  MIEMBROS    │
│          │  (Subcanales)     │   (Mensajes)     │  (Online)    │
│          │                  │                  │              │
│ ┌──────┐ │ ┌──────────────┐ │ ┌──────────────┐ │ ┌──────────┐ │
│ │📢    │ │ │ 📢 general   │ │ │ Mensaje 1    │ │ │ 👤 User1  │ │
│ │General│ │ │ 📢 anuncios  │ │ │ Mensaje 2    │ │ │ 👤 User2  │ │
│ └──────┘ │ │              │ │ │ Mensaje 3    │ │ │ 👤 User3  │ │
│          │ │ 🏢 Sucursales│ │ │              │ │ │           │ │
│ ┌──────┐ │ │ ├ 📢 suc-1   │ │ │ [Escribir...]│ │ │           │ │
│ │🏢    │ │ │ ├ 📢 suc-2   │ │ │ [📎] [Enviar]│ │ │           │ │
│ │Sucur.│ │ │              │ │ └──────────────┘ │ └──────────┘ │
│ └──────┘ │ │ ⚙️ Equipos   │ │                  │              │
│          │ │ ├ 📢 equipo-1│ │                  │              │
│ ┌──────┐ │ │ ├ 📢 equipo-2│ │                  │              │
│ │⚙️    │ │ │              │ │                  │              │
│ │Equip.│ │ │ [+ Crear]    │ │                  │              │
│ └──────┘ │ └──────────────┘ │                  │              │
│          │                  │                  │              │
│ [+ Crear]│                  │                  │              │
└──────────┴──────────────────┴──────────────────┴──────────────┘
```

## Componentes Principales

### 1. Sidebar Izquierda (Categorías de Canales)
- **General** (siempre presente, no editable)
- **Sucursales** (categoría, puede tener subcanales)
- **Equipos Internos** (categoría, puede tener subcanales)
- Botón **"+ Crear"** para crear nuevas categorías

### 2. Lista de Canales (Centro-Izquierda)
- Muestra subcanales de la categoría seleccionada
- Cada subcanal tiene:
  - Icono (📢 para texto, 🔊 para voz - futuro)
  - Nombre del canal
  - Indicador de mensajes no leídos (badge rojo)
- Botón **"+ Crear Canal"** al final de la lista
- Click derecho en canal → menú contextual:
  - Editar canal
  - Eliminar canal
  - Configurar permisos

### 3. Área de Chat (Centro-Derecha)
- **Header del canal:**
  - Nombre del canal
  - Icono de configuración (⚙️)
  - Botón de miembros (👥)
- **Lista de mensajes:**
  - Avatar del usuario
  - Nombre y timestamp
  - Contenido del mensaje
  - Reacciones (futuro)
  - Archivos adjuntos
- **Input de mensaje:**
  - Campo de texto
  - Botón adjuntar archivo (📎)
  - Botón emoji (😀)
  - Botón enviar (→)

### 4. Sidebar Derecha (Miembros)
- Lista de usuarios online
- Agrupados por:
  - En línea (verde)
  - Ausente (amarillo)
  - No molestar (rojo)
  - Desconectado (gris)

## Funcionalidades

### Crear Canal
- Modal con:
  - Nombre del canal
  - Categoría (General, Sucursal, Equipo)
  - Tipo (Texto, Voz - futuro)
  - Descripción (opcional)
  - Permisos (quién puede ver/escribir)

### Editar Canal
- Mismo modal que crear, pero con datos prellenados
- Opción de eliminar canal

### Permisos por Canal
- Roles que pueden ver el canal
- Roles que pueden escribir
- Roles que pueden administrar

## Esquema de Base de Datos Propuesto

```prisma
model Canal {
  id            String   @id @default(cuid())
  nombre        String
  descripcion   String?
  categoria     String   // "GENERAL", "SUCURSAL", "EQUIPO"
  tipo          String   @default("TEXTO") // "TEXTO", "VOZ"
  orden         Int      @default(0)
  activo        Boolean  @default(true)
  creadoPorId   String
  sucursalId    String?  // Si es categoría Sucursal
  equipoId      String?  // Si es categoría Equipo
  fechaCreacion DateTime @default(now())
  
  creadoPor     Usuario  @relation("CanalCreadoPor", fields: [creadoPorId], references: [id])
  sucursal      Sucursal? @relation(fields: [sucursalId], references: [id])
  equipo        Maquinaria? @relation(fields: [equipoId], references: [id])
  mensajes      Mensaje[]
  permisos      CanalPermiso[]
}

model CanalPermiso {
  id        String @id @default(cuid())
  canalId   String
  rol       String // "SUPER_ADMIN", "RESPONSABLE_SANITARIO", etc.
  puedeVer  Boolean @default(true)
  puedeEscribir Boolean @default(true)
  puedeAdministrar Boolean @default(false)
  
  canal     Canal  @relation(fields: [canalId], references: [id], onDelete: Cascade)
  
  @@unique([canalId, rol])
}

model Mensaje {
  id          String   @id @default(cuid())
  contenido   String
  canalId     String   // Cambiar de tipo a canalId
  archivoUrl  String?
  tipoArchivo String?
  nombreArchivo String?
  fechaEnvio  DateTime @default(now())
  editado     Boolean  @default(false)
  fechaEdicion DateTime?
  eliminado    Boolean  @default(false)
  remitenteId String
  
  remitente   Usuario  @relation(fields: [remitenteId], references: [id])
  canal       Canal    @relation(fields: [canalId], references: [id])
  reacciones  ReaccionMensaje[]
}

model ReaccionMensaje {
  id        String @id @default(cuid())
  mensajeId String
  usuarioId String
  emoji     String // "👍", "❤️", etc.
  
  mensaje   Mensaje @relation(fields: [mensajeId], references: [id], onDelete: Cascade)
  usuario   Usuario @relation(fields: [usuarioId], references: [id])
  
  @@unique([mensajeId, usuarioId, emoji])
}
```

## Colores y Estilo (Discord-like)

- **Fondo principal:** `#36393f` (gris oscuro)
- **Sidebar canales:** `#2f3136` (gris más oscuro)
- **Sidebar miembros:** `#2f3136`
- **Área de chat:** `#36393f`
- **Input:** `#40444b` (gris medio)
- **Texto:** `#dcddde` (gris claro)
- **Acentos:** `#5865f2` (azul Discord)
- **Hover:** `#3c3f44` (gris hover)

## Responsive

- En móvil: Solo área de chat, menú hamburguesa para canales
- En tablet: Sidebar colapsable
- En desktop: Layout completo de 3 columnas

