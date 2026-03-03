# Componente ComandaLetterhead

Componente para mostrar comandas de laboratorio con formato de membretado profesional, agrupando elementos por categorías correctamente.

## 📋 Características

- ✅ **Separación correcta por múltiples categorías** (no solo una)
- ✅ **Ordenamiento por orden de categoría** (usando `CategoriaAnalitoDetalle.orden`)
- ✅ **Información completa de analitos** (unidad, descripción)
- ✅ **Template personalizable** (header, bloques, footer)
- ✅ **Soporte para resultados** (muestra valores si existen)
- ✅ **Responsive y listo para impresión**

## 🚀 Instalación

Los archivos ya están creados en:
- `components/ComandaLetterhead.tsx` - Componente principal
- `components/types.ts` - Tipos TypeScript
- `lib/comanda-helpers.ts` - Funciones helper
- `lib/comanda-templates.ts` - Templates predefinidos

## 📖 Uso Básico

```tsx
import { ComandaLetterhead } from '@/components/ComandaLetterhead'
import { templateDefault } from '@/lib/comanda-templates'
import { prepararComandaParaLetterhead } from '@/lib/comanda-helpers'

// 1. Obtener comanda de la API
const response = await fetch(`/api/comandas/${comandaId}`, {
  headers: getAuthHeaders()
})
const data = await response.json()

// 2. Preparar comanda con elementos agrupados
const comandaPreparada = prepararComandaParaLetterhead(data.data)

// 3. Usar el componente
<ComandaLetterhead 
  comanda={comandaPreparada} 
  template={templateDefault}
/>
```

## 🎨 Templates Disponibles

### Template por Defecto
```tsx
import { templateDefault } from '@/lib/comanda-templates'
```

### Template Minimalista
```tsx
import { templateMinimal } from '@/lib/comanda-templates'
```

### Template Completo
```tsx
import { templateCompleto } from '@/lib/comanda-templates'
```

### Template Personalizado
```tsx
const miTemplate: ComandaTemplate = {
  ...templateDefault,
  header: {
    ...templateDefault.header,
    labName: 'Mi Laboratorio',
    showLogo: true,
    logoUrl: '/mi-logo.png'
  },
  analitosBlock: {
    showUnidad: true,
    showDescripcionAnalito: true,
    showResultados: true
  }
}
```

## 🔧 Funciones Helper

### `agruparElementosPorCategoria()`
Agrupa elementos por TODAS las categorías correspondientes (no solo una).

```tsx
import { agruparElementosPorCategoria } from '@/lib/comanda-helpers'

const grupos = agruparElementosPorCategoria(
  comanda.elementos,
  comanda.tipoPrueba,
  comanda.resultados
)
```

### `prepararComandaParaLetterhead()`
Prepara una comanda completa con `elementosAgrupados` calculado.

```tsx
import { prepararComandaParaLetterhead } from '@/lib/comanda-helpers'

const comandaPreparada = prepararComandaParaLetterhead(comandaRaw)
```

## 📊 Estructura de Datos

### ComandaConCategorias
```typescript
interface ComandaConCategorias {
  // ... campos básicos de comanda ...
  tipoPrueba: {
    categorias?: Array<{
      categoria: {
        id: string
        nombre: string
        descripcion?: string
        analitos: Array<{
          analito: Analito
          orden: number
        }>
      }
    }>
    analitosAsignados?: Array<{
      analito: Analito
    }>
  }
  elementosAgrupados: Array<{
    categoria: CategoriaAnalito | null
    elementos: Array<{
      nombre: string
      unidad?: string
      descripcion?: string
      orden: number
      tieneResultado: boolean
      resultado?: Resultado
    }>
  }>
}
```

## 🔄 Cambios en la API

La query de `app/api/comandas/[id]/route.ts` ha sido actualizada para incluir:

```typescript
tipoPrueba: {
  include: {
    categorias: {
      include: {
        categoria: {
          include: {
            analitos: {
              include: { analito: true },
              orderBy: { orden: 'asc' }
            }
          }
        }
      }
    },
    analitosAsignados: {
      include: { analito: true }
    }
  }
}
```

## 🎯 Diferencias con el Código Anterior

### ❌ Antes (Incorrecto):
- Solo mostraba UNA categoría (la "mejor")
- No usaba el orden de `CategoriaAnalitoDetalle`
- No mostraba información completa de analitos

### ✅ Ahora (Correcto):
- Separa por TODAS las categorías del tipoPrueba
- Usa `orden` para ordenar elementos
- Muestra unidad y descripción de analitos
- Agrupa correctamente elementos sin categoría en "Otros"

## 📝 Ejemplo Completo

Ver `components/ComandaLetterhead.example.tsx` para un ejemplo completo de implementación.

## 🖨️ Impresión

El componente está optimizado para impresión con:
- Tamaño de página A4 (21cm x 27cm)
- Márgenes configurables
- Estilos de impresión (`print:` classes)

```tsx
<button onClick={() => window.print()}>
  Imprimir
</button>
```

## 🎨 Personalización

Puedes personalizar:
- Logo del laboratorio
- Información del header
- Campos a mostrar del paciente
- Campos a mostrar de la comanda
- Columnas de la tabla de analitos
- Footer personalizado
- Márgenes y espaciado

## 📚 Referencias

- Ver `RESUMEN_COMANDAS_CATEGORIAS.md` para análisis completo del sistema
- Ver `components/types.ts` para todos los tipos disponibles
- Ver `lib/comanda-helpers.ts` para funciones de agrupación












