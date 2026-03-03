/**
 * Ejemplo de uso del componente ComandaLetterhead
 * 
 * Este archivo muestra cómo usar el componente ComandaLetterhead
 * en una página o componente de Next.js
 */

'use client'

import { useState, useEffect } from 'react'
import { ComandaLetterhead } from './ComandaLetterhead'
import { templateDefault } from '@/lib/comanda-templates'
import { prepararComandaParaLetterhead } from '@/lib/comanda-helpers'
import { getAuthHeaders } from '@/lib/api-helpers'
import type { ComandaConCategorias } from './types'

export default function ComandaLetterheadExample({ comandaId }: { comandaId: string }) {
  const [comanda, setComanda] = useState<ComandaConCategorias | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchComanda() {
      try {
        setLoading(true)
        const headers = getAuthHeaders()
        
        const response = await fetch(`/api/comandas/${comandaId}`, {
          headers
        })
        
        if (!response.ok) {
          throw new Error('Error al obtener la comanda')
        }
        
        const data = await response.json()
        
        if (!data.success || !data.data) {
          throw new Error('Comanda no encontrada')
        }
        
        // Preparar comanda con elementos agrupados
        const comandaPreparada = prepararComandaParaLetterhead(data.data)
        setComanda(comandaPreparada)
      } catch (err: any) {
        setError(err.message || 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    if (comandaId) {
      fetchComanda()
    }
  }, [comandaId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        Error: {error}
      </div>
    )
  }

  if (!comanda) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
        No se encontró la comanda
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50">
      {/* Botones de acción */}
      <div className="mb-4 flex gap-2 justify-end">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Imprimir
        </button>
        <button
          onClick={() => {
            // Generar PDF (implementar según tu lógica)
            console.log('Generar PDF')
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Descargar PDF
        </button>
      </div>

      {/* Componente de letterhead */}
      <ComandaLetterhead 
        comanda={comanda} 
        template={templateDefault}
      />
    </div>
  )
}

/**
 * Ejemplo de uso directo con datos ya cargados:
 */
export function ComandaLetterheadDirectExample({ comandaData }: { comandaData: any }) {
  // Preparar comanda con elementos agrupados
  const comandaPreparada = prepararComandaParaLetterhead(comandaData)
  
  // Personalizar template si es necesario
  const templatePersonalizado = {
    ...templateDefault,
    header: {
      ...templateDefault.header,
      labName: 'Mi Laboratorio Personalizado',
      labAddress: 'Mi dirección personalizada',
      showSucursal: true
    }
  }

  return (
    <ComandaLetterhead 
      comanda={comandaPreparada} 
      template={templatePersonalizado}
    />
  )
}












