'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { ComandaLetterhead } from '@/components/ComandaLetterhead'
import { templateDefault } from '@/lib/comanda-templates'
import { prepararComandaParaLetterhead } from '@/lib/comanda-helpers'
import type { ComandaConCategorias, ComandaTemplate, LaboratorioInfo } from '@/components/types'

interface Analito {
  id: string
  nombre: string
  unidad?: string | null
}

interface CategoriaAnalito {
  id: string
  nombre: string
  descripcion?: string | null
  analitos: Array<{
    analito: Analito
    orden: number
  }>
}

interface Comanda {
  id: string
  numeroComanda: string
  estado: string
  elementos: string[]
  cliente: {
    id: string
    nombre: string
    apellido: string
    email?: string
    telefono?: string | null
    fechaNacimiento?: string | null
  }
  sucursal: {
    id: string
    nombre: string
    direccion?: string
    telefono?: string
    email?: string | null
  }
  tipoPrueba: {
    id: string
    nombre: string
    categorias?: Array<{
      categoria: {
        id: string
        nombre: string
        descripcion?: string | null
      }
    }>
  }
  resultados: Array<{
    id: string
    elemento: string
    valor: number
    unidad: string
    rangoNormal: string
    observaciones?: string
    fechaRegistro: string
    registradoPor: {
      id: string
      nombre: string
      apellido: string
    }
  }>
}

async function obtenerLaboratorioInfo(sucursalId: string): Promise<LaboratorioInfo | null> {
  try {
    const response = await fetch(`/api/sucursales/${sucursalId}`)
    const data = await response.json()
    
    if (data.success && data.data) {
      const sucursal = data.data
      return {
        nombre: sucursal.nombre || 'Laboratorio Clínico',
        direccion: sucursal.direccion || null,
        telefono: sucursal.telefono || null,
        email: sucursal.email || null,
        rfc: null,
        logoUrl: null,
        responsableSanitario: null
      }
    }
    return null
  } catch (error) {
    console.error('Error al obtener información del laboratorio:', error)
    return null
  }
}

export default function ModificacionesPage({ params }: { params: { id: string } }) {
  const [comanda, setComanda] = useState<Comanda | null>(null)
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<CategoriaAnalito[]>([])
  const [analitos, setAnalitos] = useState<Analito[]>([])
  const [laboratorioInfo, setLaboratorioInfo] = useState<LaboratorioInfo | null>(null)
  const [plantillaFormato, setPlantillaFormato] = useState<ComandaTemplate | null>(null)
  const router = useRouter()

  // Cargar plantilla de formato global
  const loadPlantillaFormato = async () => {
    try {
      const response = await fetch('/api/plantilla-formato')
      const data = await response.json()
      
      if (data.success && data.data) {
        const template: ComandaTemplate = {
          ...templateDefault,
          ...data.data,
          header: data.data.header || templateDefault.header,
          pacienteBlock: data.data.pacienteBlock || templateDefault.pacienteBlock,
          comandaBlock: data.data.comandaBlock || templateDefault.comandaBlock,
          analitosBlock: data.data.analitosBlock || templateDefault.analitosBlock,
          footer: data.data.footer || templateDefault.footer
        }
        setPlantillaFormato(template)
      } else {
        setPlantillaFormato(templateDefault)
      }
    } catch (error) {
      console.error('Error al cargar plantilla de formato:', error)
      setPlantillaFormato(templateDefault)
    }
  }

  // Cargar datos del catálogo
  const loadCatalogData = async () => {
    try {
      // Cargar categorías
      const catResponse = await fetch('/api/categorias-analito')
      const catData = await catResponse.json()
      if (catData.success) {
        setCategorias(catData.data || [])
      }

      // Cargar analitos
      const analResponse = await fetch('/api/analitos')
      const analData = await analResponse.json()
      if (analData.success) {
        setAnalitos(analData.data || [])
      }
    } catch (error) {
      console.error('Error al cargar datos del catálogo:', error)
    }
  }

  // Cargar comanda
  useEffect(() => {
    const loadComanda = async () => {
      try {
        setLoading(true)
        
        const response = await fetch(`/api/comandas/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        const data = await response.json()

        if (data.success) {
          setComanda(data.data)
          
          // Cargar información del laboratorio
          const labInfo = await obtenerLaboratorioInfo(data.data.sucursalId)
          setLaboratorioInfo(labInfo)
        } else {
          toast.error(data.error || 'Error al cargar comanda')
          router.push('/dashboard/comandas')
        }
      } catch (error) {
        console.error('Error al cargar comanda:', error)
        toast.error('Error al cargar comanda')
        router.push('/dashboard/comandas')
      } finally {
        setLoading(false)
      }
    }

    loadComanda()
    loadPlantillaFormato()
    loadCatalogData()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Cargando...</p>
      </div>
    )
  }

  if (!comanda) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-600">Error: No se pudo cargar la comanda</p>
      </div>
    )
  }

  // Preparar categorías con estructura completa
  const categoriasCompletas = categorias.map(cat => ({
    categoria: {
      id: cat.id,
      nombre: cat.nombre,
      descripcion: cat.descripcion || null,
      analitos: cat.analitos.map(d => ({
        analito: {
          id: d.analito.id,
          nombre: d.analito.nombre,
          descripcion: null,
          unidad: d.analito.unidad || null,
          activo: true
        },
        orden: d.orden
      }))
    }
  }))

  // Usar información del laboratorio cargada
  const labInfo: LaboratorioInfo = laboratorioInfo || {
    nombre: comanda.sucursal.nombre || 'Laboratorio Clínico',
    direccion: comanda.sucursal.direccion || null,
    telefono: comanda.sucursal.telefono || null,
    email: comanda.sucursal.email || null,
    rfc: null,
    logoUrl: null,
    responsableSanitario: null
  }

  // Usar plantilla desde BD o template por defecto
  let template: ComandaTemplate = plantillaFormato || templateDefault
  
  // Asegurar que el template tenga todos los campos necesarios
  template = {
    fondoTipo: template.fondoTipo || 'color',
    fondoColor: template.fondoColor || '#ffffff',
    fondoImagenUrl: template.fondoImagenUrl || null,
    marginTop: template.marginTop ?? 15,
    marginBottom: template.marginBottom ?? 15,
    marginLeft: template.marginLeft ?? 20,
    marginRight: template.marginRight ?? 20,
    espaciadoEntreBloques: template.espaciadoEntreBloques ?? 10,
    fuentePrincipal: template.fuentePrincipal || 'Arial',
    fuenteTitulos: template.fuenteTitulos || 'Arial',
    tamanoTextoNormal: template.tamanoTextoNormal ?? 10,
    tamanoTitulos: template.tamanoTitulos ?? 14,
    colorTextoPrincipal: template.colorTextoPrincipal || '#000000',
    colorTextoSecundario: template.colorTextoSecundario || '#666666',
    colorTextoH3: template.colorTextoH3 || '#333333',
    colorBordes: template.colorBordes || '#cccccc',
    colorFondoBloques: template.colorFondoBloques || '#f5f5f5',
    colorFondoHeaderTabla: template.colorFondoHeaderTabla || '#e0e0e0',
    header: {
      showLogo: template.header?.showLogo ?? templateDefault.header.showLogo,
      showLabName: template.header?.showLabName ?? templateDefault.header.showLabName,
      showLabAddress: template.header?.showLabAddress ?? templateDefault.header.showLabAddress,
      showLabPhone: template.header?.showLabPhone ?? templateDefault.header.showLabPhone,
      showSucursal: template.header?.showSucursal ?? templateDefault.header.showSucursal,
      alignment: template.header?.alignment || templateDefault.header.alignment
    },
    pacienteBlock: {
      showNombre: template.pacienteBlock?.showNombre ?? templateDefault.pacienteBlock.showNombre,
      showFechaNacimiento: template.pacienteBlock?.showFechaNacimiento ?? templateDefault.pacienteBlock.showFechaNacimiento,
      showEdad: template.pacienteBlock?.showEdad ?? templateDefault.pacienteBlock.showEdad,
      showTelefono: template.pacienteBlock?.showTelefono ?? templateDefault.pacienteBlock.showTelefono,
      showEmail: template.pacienteBlock?.showEmail ?? templateDefault.pacienteBlock.showEmail
    },
    comandaBlock: {
      showNumeroComanda: template.comandaBlock?.showNumeroComanda ?? templateDefault.comandaBlock.showNumeroComanda,
      showFechaCreacion: template.comandaBlock?.showFechaCreacion ?? templateDefault.comandaBlock.showFechaCreacion,
      showFechaEntrega: template.comandaBlock?.showFechaEntrega ?? templateDefault.comandaBlock.showFechaEntrega,
      showEstado: template.comandaBlock?.showEstado ?? templateDefault.comandaBlock.showEstado
    },
    analitosBlock: {
      showUnidad: template.analitosBlock?.showUnidad ?? templateDefault.analitosBlock.showUnidad,
      showDescripcionAnalito: template.analitosBlock?.showDescripcionAnalito ?? templateDefault.analitosBlock.showDescripcionAnalito,
      showResultados: template.analitosBlock?.showResultados ?? templateDefault.analitosBlock.showResultados
    },
    footer: {
      showFooter: template.footer?.showFooter ?? templateDefault.footer.showFooter,
      showConfidentialText: template.footer?.showConfidentialText ?? templateDefault.footer.showConfidentialText,
      textoFooterPersonalizado: template.footer?.textoFooterPersonalizado || templateDefault.footer.textoFooterPersonalizado
    },
    ordenCategorias: template.ordenCategorias || []
  }
  
  // Preparar comanda con elementos agrupados
  const comandaPreparada = prepararComandaParaLetterhead({
    ...comanda,
    tipoPrueba: {
      ...comanda.tipoPrueba,
      categorias: categoriasCompletas.length > 0 
        ? categoriasCompletas 
        : (comanda.tipoPrueba.categorias || []),
      analitosAsignados: analitos.map(a => ({ 
        analito: {
          id: a.id,
          nombre: a.nombre,
          descripcion: null,
          unidad: a.unidad || null,
          activo: true
        }
      }))
    },
    resultados: comanda.resultados.map(r => ({
      id: r.id,
      elemento: r.elemento,
      valor: r.valor,
      unidad: r.unidad,
      rangoNormal: r.rangoNormal,
      observaciones: r.observaciones || null,
      fechaRegistro: r.fechaRegistro
    })),
    laboratorioInfo: labInfo
  } as any, template.ordenCategorias)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/dashboard/comandas/${params.id}/resultados`)}
              className="btn btn-secondary btn-sm"
              title="Volver a resultados"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Modificaciones - {comanda.numeroComanda}
              </h1>
              <p className="text-sm text-gray-600">
                Vista previa del formato membretado
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary flex items-center gap-2"
            title="Imprimir"
          >
            <PrinterIcon className="h-5 w-5" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        <div className="w-full" style={{ backgroundColor: template.fondoColor || '#ffffff' }}>
          {categorias.length > 0 && analitos.length > 0 ? (
            <ComandaLetterhead 
              comanda={comandaPreparada} 
              template={template}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-600">
                Cargando datos... (categorias: {categorias.length}, analitos: {analitos.length})
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}












