import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'

// Configuración de Firebase
// NOTA: Estas variables deben estar en .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
}

// Inicializar Firebase solo una vez
let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    const apps = getApps()
    if (apps.length === 0) {
      app = initializeApp(firebaseConfig)
    } else {
      app = apps[0]
    }
  }
  return app
}

export const getFirestoreDB = (): Firestore => {
  if (!db) {
    const app = getFirebaseApp()
    // Solo inicializar en el cliente (navegador)
    if (typeof window !== 'undefined') {
      // TEMPORALMENTE: Deshabilitar persistencia para diagnosticar el problema
      // La persistencia puede estar bloqueando los snapshots entre pestañas
      console.log('[FIREBASE] 🔧 Inicializando Firestore SIN persistencia (modo diagnóstico)')
      console.log('[FIREBASE] 💡 Esto debería permitir que los snapshots se propaguen entre pestañas')
      db = getFirestore(app)
      
      // TODO: Re-habilitar persistencia una vez que funcione el tiempo real
      // try {
      //   db = initializeFirestore(app, {
      //     localCache: persistentLocalCache({
      //       tabManager: persistentMultipleTabManager()
      //     })
      //   })
      //   console.log('[FIREBASE] ✅ Persistencia habilitada con sincronización entre pestañas')
      // } catch (error: any) {
      //   console.warn('[FIREBASE] ⚠️ No se pudo habilitar persistencia, usando modo normal:', error)
      //   if (error.code === 'failed-precondition') {
      //     console.warn('[FIREBASE] 💡 Múltiples pestañas abiertas - cierra otras pestañas y recarga')
      //   }
      //   db = getFirestore(app)
      // }
    } else {
      // En el servidor, usar inicialización normal
      db = getFirestore(app)
    }
  }
  return db
}

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    const app = getFirebaseApp()
    auth = getAuth(app)
  }
  return auth
}

// Verificar si Firebase está configurado
export const isFirebaseConfigured = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )
}

