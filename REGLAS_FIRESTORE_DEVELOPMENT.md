# 🔒 Reglas de Firestore para Desarrollo

## ⚠️ PROBLEMA ACTUAL

El snapshot de Firebase no se está ejecutando porque las reglas de Firestore requieren autenticación de Firebase (`request.auth != null`), pero la aplicación usa JWT, no Firebase Auth.

## ✅ SOLUCIÓN: Reglas para Desarrollo

Ve a Firebase Console → Firestore Database → Reglas y reemplaza con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Mensajes: permitir lectura/escritura sin autenticación (SOLO PARA DESARROLLO)
    match /mensajes/{mensajeId} {
      allow read, write: if true;
    }
    
    // Canales: permitir lectura/escritura sin autenticación (SOLO PARA DESARROLLO)
    match /canales/{canalId} {
      allow read, write: if true;
    }
  }
}
```

## 📝 Pasos

1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: **labalq**
3. En el menú izquierdo, haz clic en **"Firestore Database"**
4. Haz clic en la pestaña **"Reglas"**
5. **Copia y pega** las reglas de arriba
6. Haz clic en **"Publicar"**
7. Espera unos segundos a que se publiquen

## ⚠️ IMPORTANTE

Estas reglas son **SOLO PARA DESARROLLO**. Permiten acceso completo sin autenticación.

**Para producción**, necesitarás:
- Implementar Firebase Auth, O
- Usar reglas más estrictas basadas en tokens personalizados, O
- Mantener el sistema de polling como fallback

## ✅ Verificación

Después de publicar las reglas:

1. Refresca la página del chat
2. Abre la consola del navegador (F12)
3. Deberías ver: `[FIREBASE] ⚡ Snapshot recibido`
4. Si ves errores de permisos, espera 1-2 minutos y vuelve a intentar (las reglas pueden tardar en propagarse)


