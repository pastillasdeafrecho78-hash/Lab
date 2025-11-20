# Instalación de Node.js - Guía Rápida

## 🚀 Instalación de Node.js

### Opción 1: Instalación desde el sitio oficial (Recomendado)

1. **Descargar Node.js:**
   - Ir a: https://nodejs.org/
   - Descargar la versión **LTS** (Long Term Support)
   - Ejecutar el instalador `.msi`

2. **Durante la instalación:**
   - ✅ Asegúrate de marcar la opción **"Add to PATH"**
   - ✅ Marcar todas las opciones recomendadas
   - ✅ Instalar herramientas de compilación (opcional pero recomendado)

3. **Verificar instalación:**
   - Cerrar y abrir **nuevamente** PowerShell
   - Ejecutar:
     ```powershell
     node --version
     npm --version
     ```
   - Deberías ver números de versión (ej: v20.10.0 y 10.2.3)

### Opción 2: Usando Chocolatey (si lo tienes instalado)

```powershell
choco install nodejs-lts
```

### Opción 3: Usando winget (Windows 10/11)

```powershell
winget install OpenJS.NodeJS.LTS
```

## ⚠️ Importante

**Después de instalar Node.js:**
- **Cierra y vuelve a abrir PowerShell** para que reconozca los comandos
- O reinicia tu computadora si es necesario

## ✅ Una vez instalado Node.js

Ejecuta estos comandos en orden:

```powershell
# Navegar al proyecto
cd "C:\Users\Salvador Barba (TD)\Desktop\App lab"

# 1. Instalar dependencias
npm install

# 2. Generar cliente Prisma
npm run db:generate

# 3. Ejecutar migraciones
npm run db:migrate

# 4. Crear usuario administrador
node scripts/create-admin.js

# 5. Iniciar servidor
npm run dev
```

## 🔍 Verificar si Node.js ya está instalado

Si crees que Node.js ya está instalado pero no se reconoce:

1. **Buscar manualmente:**
   - Buscar en: `C:\Program Files\nodejs\`
   - O en: `C:\Program Files (x86)\nodejs\`

2. **Agregar al PATH manualmente:**
   - Panel de Control → Sistema → Configuración avanzada del sistema
   - Variables de entorno → Variables del sistema → Path → Editar
   - Agregar: `C:\Program Files\nodejs`
   - Reiniciar PowerShell

## 📞 Si necesitas ayuda

El error de Visual Studio Installer que viste no afecta la instalación de Node.js. Puedes ignorarlo o cerrar Visual Studio Installer si está abierto.






