# 🔥 Guía Paso a Paso: Configurar Firebase para Chat en Tiempo Real

## 📋 Paso 1: Crear Proyecto en Firebase

1. **Abre tu navegador** y ve a: https://console.firebase.google.com/
2. **Inicia sesión** con tu cuenta de Google
3. **Haz clic en "Agregar proyecto"** (botón grande en el centro o "+")
4. **Ingresa el nombre del proyecto**: `laboratorio-comandas` (o el que prefieras)
5. **Haz clic en "Continuar"**
6. **Desactiva Google Analytics** (opcional, no es necesario para esto)
7. **Haz clic en "Crear proyecto"**
8. **Espera** a que se cree el proyecto (30-60 segundos)
9. **Haz clic en "Continuar"** cuando esté listo

## 📋 Paso 2: Habilitar Firestore Database

1. En el panel izquierdo, busca **"Firestore Database"** (ícono de base de datos)
2. **Haz clic en "Crear base de datos"**
3. Selecciona **"Iniciar en modo de prueba"** (puedes cambiar las reglas después)
4. **Haz clic en "Siguiente"**
5. **Selecciona una ubicación** para tu base de datos (elige la más cercana a tu ubicación)
6. **Haz clic en "Habilitar"**
7. **Espera** a que se cree la base de datos (1-2 minutos)

## 📋 Paso 3: Configurar Reglas de Seguridad (Opcional pero Recomendado)

1. En Firestore Database, ve a la pestaña **"Reglas"**
2. **Reemplaza** el contenido con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Mensajes: usuarios autenticados pueden leer/escribir
    match /mensajes/{mensajeId} {
      allow read, write: if request.auth != null;
    }
    
    // Canales: usuarios autenticados pueden leer
    match /canales/{canalId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

3. **Haz clic en "Publicar"**

**Nota:** Estas reglas son básicas. Para producción, necesitarás reglas más estrictas basadas en roles.

## 📋 Paso 4: Obtener Credenciales de Firebase

1. En el panel izquierdo, haz clic en el **ícono de engranaje** (⚙️) junto a "Visión general del proyecto"
2. Selecciona **"Configuración del proyecto"**
3. Desplázate hacia abajo hasta la sección **"Tus aplicaciones"**
4. Si no hay aplicaciones, haz clic en el ícono de **web** (`</>`)
5. **Registra la app**:
   - **Nombre de la app**: `Laboratorio Web` (o el que prefieras)
   - **No marques** "También configurar Firebase Hosting" (no es necesario)
   - **Haz clic en "Registrar app"**
6. **Copia las credenciales** que aparecen. Deberías ver algo como:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## 📋 Paso 5: Agregar Variables al .env.local

1. **Abre el archivo `.env.local`** en la raíz del proyecto (si no existe, créalo)
2. **Agrega estas líneas** al final del archivo (reemplaza los valores con los que copiaste):

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

3. **Guarda el archivo**

## 📋 Paso 6: Reiniciar el Servidor

1. **Detén el servidor** si está corriendo (Ctrl+C en la terminal)
2. **Inicia el servidor** de nuevo:
   ```bash
   npm run dev
   ```

## ✅ Verificación

1. **Abre la aplicación** en el navegador: http://localhost:3000
2. **Inicia sesión**
3. **Ve a** `/dashboard/chat`
4. **Abre la consola del navegador** (F12)
5. **Deberías ver** mensajes relacionados con Firebase si está configurado correctamente
6. **Envía un mensaje de prueba**
7. **Verifica en Firebase Console**:
   - Ve a Firestore Database
   - Deberías ver la colección `mensajes` con tu mensaje

## 🎯 Resultado Esperado

- ✅ Los mensajes aparecen **instantáneamente** para todos los usuarios
- ✅ No necesitas recargar la página para ver mensajes nuevos
- ✅ El chat funciona en **tiempo real** como WhatsApp o Discord

## ⚠️ Si Algo No Funciona

1. **Verifica** que todas las variables en `.env.local` empiecen con `NEXT_PUBLIC_`
2. **Verifica** que no haya espacios extra o comillas incorrectas
3. **Reinicia** el servidor después de cambiar `.env.local`
4. **Revisa la consola** del navegador para errores
5. **Verifica** que Firestore esté habilitado en Firebase Console

## 📝 Notas Importantes

- **Firebase es gratuito** para uso básico (hasta 50,000 lecturas/día)
- **Los mensajes se sincronizan** automáticamente con PostgreSQL para auditoría
- **Si Firebase no está configurado**, el chat seguirá funcionando con API REST (sin tiempo real)

