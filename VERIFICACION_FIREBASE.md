# ✅ Verificación de Firebase - Checklist

## 🔍 Pasos para que funcione el tiempo real:

### 1. ✅ Variables de Entorno (.env.local)
- [x] Ya están guardadas correctamente

### 2. ⚠️ **REINICIAR EL SERVIDOR** (MUY IMPORTANTE)
Después de cambiar `.env.local`, **DEBES reiniciar el servidor**:

```bash
# Detén el servidor (Ctrl+C)
# Luego inicia de nuevo:
npm run dev
```

**Sin reiniciar, las variables no se cargan.**

### 3. 🔥 Habilitar Firestore en Firebase Console

1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: **labalq**
3. En el menú izquierdo, busca **"Firestore Database"**
4. Si dice "Crear base de datos", **haz clic y créala**
5. Selecciona **"Iniciar en modo de prueba"** (para desarrollo)
6. Elige una ubicación (ej: `us-central`)
7. Haz clic en **"Habilitar"**

### 4. 🔒 Configurar Reglas de Firestore

1. En Firestore Database, ve a la pestaña **"Reglas"**
2. Reemplaza el contenido con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Mensajes: permitir lectura/escritura (modo desarrollo)
    match /mensajes/{mensajeId} {
      allow read, write: if true;
    }
    
    // Canales: permitir lectura/escritura (modo desarrollo)
    match /canales/{canalId} {
      allow read, write: if true;
    }
  }
}
```

3. Haz clic en **"Publicar"**

**⚠️ IMPORTANTE:** Estas reglas son para desarrollo. En producción necesitarás reglas más estrictas.

### 5. 🧪 Verificar en el Navegador

1. Abre la aplicación: http://localhost:3000
2. Inicia sesión
3. Ve a `/dashboard/chat`
4. Abre la **consola del navegador** (F12 → Console)
5. Busca estos mensajes:
   - ✅ Si ves: `"Firebase configurado correctamente"` → Todo bien
   - ❌ Si ves: `"Firebase no está configurado"` → Revisa .env.local y reinicia servidor
   - ❌ Si ves errores de permisos → Revisa las reglas de Firestore

### 6. 📤 Probar Envío de Mensaje

1. Selecciona un canal
2. Escribe un mensaje
3. Envía
4. Verifica en Firebase Console:
   - Ve a Firestore Database
   - Deberías ver la colección `mensajes` con tu mensaje

### 7. 🔄 Verificar Tiempo Real

1. Abre **dos ventanas** del navegador (o dos navegadores diferentes)
2. Inicia sesión en ambas con diferentes usuarios
3. En una ventana, envía un mensaje
4. En la otra ventana, **debería aparecer automáticamente** sin recargar

## 🐛 Problemas Comunes

### "Los mensajes no aparecen en tiempo real"
- ✅ Verifica que Firestore esté habilitado
- ✅ Verifica que las reglas permitan lectura/escritura
- ✅ Reinicia el servidor después de cambiar .env.local
- ✅ Revisa la consola del navegador para errores

### "Error: Missing or insufficient permissions"
- ✅ Revisa las reglas de Firestore (deben permitir `read, write: if true` en modo desarrollo)

### "Firebase no está configurado"
- ✅ Verifica que todas las variables en .env.local empiecen con `NEXT_PUBLIC_`
- ✅ Reinicia el servidor
- ✅ Verifica que no haya espacios o comillas incorrectas

## 📝 Nota Importante

Si después de seguir todos estos pasos aún no funciona, comparte:
1. Los errores que ves en la consola del navegador (F12)
2. Si Firestore está habilitado en Firebase Console
3. Si las reglas de Firestore están configuradas



