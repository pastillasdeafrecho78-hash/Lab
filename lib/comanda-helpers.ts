// Funciones helper para trabajar con comandas y categorías

import type {
  ComandaConCategorias,
  GrupoElementos,
  ElementoAgrupado,
  CategoriaAnalito,
  TipoPrueba,
  Resultado
} from '@/components/types'

/**
 * Agrupa los elementos de una comanda por la MEJOR categoría (la que tiene más elementos coincidentes)
 * Solo muestra UNA categoría, no múltiples
 */
export function agruparElementosPorCategoria(
  elementos: string[],
  tipoPrueba: TipoPrueba,
  resultados: Resultado[] = []
): GrupoElementos[] {
  const grupos: GrupoElementos[] = []
  
  // Crear mapa de resultados por nombre de elemento
  const resultadosMap = new Map<string, Resultado>()
  resultados.forEach(r => {
    resultadosMap.set(r.elemento, r)
  })

  // Obtener categorías del tipoPrueba
  const categoriasTipoPrueba = tipoPrueba.categorias || []
  
  // Crear mapa de analitos asignados para obtener información completa
  const analitosMap = new Map<string, { unidad?: string; descripcion?: string }>()
  if (tipoPrueba.analitosAsignados) {
    tipoPrueba.analitosAsignados.forEach(ta => {
      analitosMap.set(ta.analito.nombre, {
        unidad: ta.analito.unidad || undefined,
        descripcion: ta.analito.descripcion || undefined
      })
    })
  }

  // Encontrar la categoría con MAYOR cantidad de elementos coincidentes
  let mejorCategoria: CategoriaAnalito | null = null
  let maxCoincidencias = 0
  let elementosEnMejorCategoria: string[] = []

  for (const tpc of categoriasTipoPrueba) {
    const categoria = tpc.categoria
    const analitosCategoria = categoria.analitos.map(d => d.analito.nombre)
    
    // Contar cuántos elementos de la comanda están en esta categoría
    const elementosCoincidentes = elementos.filter(e => 
      analitosCategoria.includes(e)
    )
    
    // Solo considerar si tiene más coincidencias que la mejor encontrada
    if (elementosCoincidentes.length > maxCoincidencias) {
      maxCoincidencias = elementosCoincidentes.length
      mejorCategoria = categoria
      elementosEnMejorCategoria = elementosCoincidentes
    }
  }

  // Si encontramos una categoría con elementos coincidentes, usarla
  if (mejorCategoria && elementosEnMejorCategoria.length > 0) {
    const elementosFormateados = elementosEnMejorCategoria
      .map(nombreElemento => {
        // Buscar el detalle de la categoría para obtener el orden
        const detalle = mejorCategoria!.analitos.find(
          d => d.analito.nombre === nombreElemento
        )
        
        // Obtener información del analito
        const infoAnalito = analitosMap.get(nombreElemento)
        const resultado = resultadosMap.get(nombreElemento)
        
        return {
          nombre: nombreElemento,
          unidad: detalle?.analito.unidad || infoAnalito?.unidad || undefined,
          descripcion: detalle?.analito.descripcion || infoAnalito?.descripcion || undefined,
          orden: detalle?.orden ?? 999,
          tieneResultado: !!resultado,
          resultado: resultado
        } as ElementoAgrupado
      })
      .sort((a, b) => a.orden - b.orden) // Ordenar por orden de la categoría
    
    grupos.push({
      categoria: mejorCategoria,
      elementos: elementosFormateados
    })

    // Elementos que no están en la mejor categoría van a "Otros"
    const elementosOtros = elementos
      .filter(e => !elementosEnMejorCategoria.includes(e))
      .map(nombreElemento => {
        const infoAnalito = analitosMap.get(nombreElemento)
        const resultado = resultadosMap.get(nombreElemento)
        
        return {
          nombre: nombreElemento,
          unidad: infoAnalito?.unidad || undefined,
          descripcion: infoAnalito?.descripcion || undefined,
          orden: 999,
          tieneResultado: !!resultado,
          resultado: resultado
        } as ElementoAgrupado
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))

    if (elementosOtros.length > 0) {
      grupos.push({
        categoria: null,
        elementos: elementosOtros
      })
    }
  } else {
    // Si no hay ninguna categoría que coincida, todos van a "Otros"
    const elementosOtros = elementos
      .map(nombreElemento => {
        const infoAnalito = analitosMap.get(nombreElemento)
        const resultado = resultadosMap.get(nombreElemento)
        
        return {
          nombre: nombreElemento,
          unidad: infoAnalito?.unidad || undefined,
          descripcion: infoAnalito?.descripcion || undefined,
          orden: 999,
          tieneResultado: !!resultado,
          resultado: resultado
        } as ElementoAgrupado
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))

    if (elementosOtros.length > 0) {
      grupos.push({
        categoria: null,
        elementos: elementosOtros
      })
    }
  }

  return grupos
}

/**
 * Prepara una comanda para ser usada en el componente ComandaLetterhead
 * Agrega el campo elementosAgrupados con la lógica correcta
 */
export function prepararComandaParaLetterhead(
  comanda: any
): ComandaConCategorias {
  const elementosAgrupados = agruparElementosPorCategoria(
    comanda.elementos || [],
    comanda.tipoPrueba || {},
    comanda.resultados || []
  )

  return {
    ...comanda,
    elementosAgrupados
  }
}

