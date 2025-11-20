# Configuración de Firebase para Chat en Tiempo Real

## 📋 Requisitos Previos

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Firestore Database
3. Obtener las credenciales de configuración

## 🔧 Pasos de Configuración

### 1. Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Ingresa el nombre del proyecto (ej: `laboratorio-comandas`)
4. Sigue los pasos del asistente

### 2. Habilitar Firestore

1. En el panel de Firebase, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Iniciar en modo de prueba" (puedes cambiar las reglas después)
4. Elige una ubicación para tu base de datos

### 3. Configurar Reglas de Seguridad

En Firestore, ve a "Reglas" y configura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Mensajes: solo usuarios autenticados pueden leer/escribir
    match /mensajes/{mensajeId} {
      allow read, write: if request.auth != null;
    }
    
    // Canales: solo usuarios autenticados pueden leer
    match /canales/{canalId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.resource.data.creadoPorId == request.auth.uid;
    }
  }
}
```

**Nota:** Para producción, implementa reglas más estrictas basadas en roles y permisos.

### 4. Obtener Credenciales

1. En Firebase Console, ve a "Configuración del proyecto" (ícono de engranaje)
2. Desplázate hasta "Tus aplicaciones"
3. Haz clic en el ícono de web (`</>`)
4. Registra la app con un nombre (ej: "Laboratorio Web")
5. Copia las credenciales que se muestran

### 5. Configurar Variables de Entorno

Crea o actualiza `.env.local` en la raíz del proyecto:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### 6. Reiniciar el Servidor

```bash
npm run dev
```

## ✅ Verificación

Una vez configurado:

1. Abre la aplicación en el navegador
2. Ve a `/dashboard/chat`
3. Abre la consola del navegador (F12)
4. Deberías ver mensajes de Firebase si está configurado correctamente
5. Si Firebase no está configurado, el chat usará el fallback de API REST

## 🔄 Funcionamiento

### Con Firebase (Tiempo Real)
- Los mensajes se sincronizan automáticamente en tiempo real
- No hay necesidad de recargar o hacer polling
- Los mensajes nuevos aparecen instantáneamente para todos los usuarios

### Sin Firebase (Fallback)
- El chat funciona con polling cada vez que se envía un mensaje
- Funcional pero no en tiempo real
- Los usuarios necesitan enviar un mensaje o recargar para ver nuevos mensajes

## 📝 Notas Importantes

1. **Sincronización con PostgreSQL**: Los mensajes enviados a Firebase se sincronizan automáticamente con PostgreSQL para mantener la auditoría y el historial completo.

2. **Autenticación**: Actualmente, el sistema usa JWT para autenticación. Para usar las reglas de seguridad de Firebase, necesitarías implementar Firebase Auth o ajustar las reglas para permitir acceso basado en tokens personalizados.

3. **Costo**: Firestore tiene un plan gratuito generoso. Revisa los [límites de Firebase](https://firebase.google.com/pricing) para tu caso de uso.

4. **Producción**: Asegúrate de configurar reglas de seguridad más estrictas antes de ir a producción.

## 🐛 Solución de Problemas

### "Firebase no está configurado"
- Verifica que todas las variables de entorno estén en `.env.local`
- Reinicia el servidor de desarrollo
- Verifica que las variables empiecen con `NEXT_PUBLIC_`

### "Error de permisos en Firestore"
- Revisa las reglas de seguridad en Firebase Console
- Asegúrate de que las reglas permitan lectura/escritura para usuarios autenticados

### "Los mensajes no aparecen en tiempo real"
- Verifica la consola del navegador para errores
- Asegúrate de que Firestore esté habilitado en tu proyecto
- Verifica que la colección `mensajes` exista en Firestore

