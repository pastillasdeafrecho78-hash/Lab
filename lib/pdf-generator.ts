import { jsPDF } from 'jspdf'
import { Comanda, Resultado } from '@/types'

interface PDFData {
  comanda: Comanda
  resultados: Resultado[]
  laboratorioInfo: {
    nombre: string
    direccion: string
    telefono: string
    email?: string
    rfc?: string
    responsableSanitario?: string
  }
}

export function generateResultadosPDF(data: PDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPosition = 20

      // Header membretado del laboratorio
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(data.laboratorioInfo.nombre, 105, yPosition, { align: 'center' })
      yPosition += 10

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(data.laboratorioInfo.direccion, 105, yPosition, { align: 'center' })
      yPosition += 5

      let contactText = `Tel: ${data.laboratorioInfo.telefono}`
      if (data.laboratorioInfo.email) {
        contactText += `  |  Email: ${data.laboratorioInfo.email}`
      }
      if (data.laboratorioInfo.rfc) {
        contactText += `  |  RFC: ${data.laboratorioInfo.rfc}`
      }
      
      doc.text(contactText, 105, yPosition, { align: 'center' })
      yPosition += 8

      // Línea separadora
      doc.setLineWidth(0.5)
      doc.line(20, yPosition, 190, yPosition)
      yPosition += 10

      // Título del reporte
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('RESULTADOS DE LABORATORIO CLÍNICO', 105, yPosition, { align: 'center' })
      yPosition += 10

      // Información de la comanda
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DE LA ORDEN', 20, yPosition)
      yPosition += 7

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Número de Orden: ${data.comanda.numeroComanda}`, 25, yPosition)
      yPosition += 5
      doc.text(`Fecha: ${new Date(data.comanda.fechaCreacion).toLocaleDateString('es-ES')}`, 25, yPosition)
      yPosition += 5
      doc.text(`Sucursal: ${data.comanda.sucursal?.nombre || 'N/A'}`, 25, yPosition)
      yPosition += 8

      // Información del paciente
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DEL PACIENTE', 20, yPosition)
      yPosition += 7

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Nombre: ${data.comanda.cliente?.nombre || 'N/A'} ${data.comanda.cliente?.apellido || 'N/A'}`, 25, yPosition)
      yPosition += 5
      doc.text(`Email: ${data.comanda.cliente?.email || 'N/A'}`, 25, yPosition)
      yPosition += 5
      
      if (data.comanda.cliente?.telefono) {
        doc.text(`Teléfono: ${data.comanda.cliente.telefono}`, 25, yPosition)
        yPosition += 5
      }
        
      if (data.comanda.cliente?.fechaNacimiento) {
        doc.text(`Fecha de Nacimiento: ${new Date(data.comanda.cliente.fechaNacimiento).toLocaleDateString('es-ES')}`, 25, yPosition)
        yPosition += 5
      }

      yPosition += 5

      // Información de la prueba
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DE LA PRUEBA', 20, yPosition)
      yPosition += 7

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Tipo de Prueba: ${data.comanda.tipoPrueba?.nombre || 'N/A'}`, 25, yPosition)
      yPosition += 5
      doc.text(`Elementos Analizados: ${data.comanda.elementos.length}`, 25, yPosition)
      yPosition += 5
      doc.text(`Estado: ${data.comanda.estado.replace('_', ' ')}`, 25, yPosition)
      yPosition += 5

      if (data.comanda.fechaCompletado) {
        doc.text(`Fecha de Completado: ${new Date(data.comanda.fechaCompletado).toLocaleDateString('es-ES')}`, 25, yPosition)
        yPosition += 5
      }

      yPosition += 5

      // Resultados
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('RESULTADOS', 20, yPosition)
      yPosition += 7

      if (data.resultados.length === 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('No hay resultados disponibles', 25, yPosition)
      } else {
        // Headers de la tabla
        const startX = 20
        const colWidths = [60, 30, 25, 35, 30]
        const colPositions = [
          startX,
          startX + colWidths[0],
          startX + colWidths[0] + colWidths[1],
          startX + colWidths[0] + colWidths[1] + colWidths[2],
          startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
        ]

        // Fondo para headers
        doc.setFillColor(52, 58, 64) // Gris oscuro
        doc.rect(startX, yPosition - 5, 170, 7, 'F')
        
        // Headers
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255) // Blanco
        doc.text('Elemento', colPositions[0] + 2, yPosition)
        doc.text('Valor', colPositions[1] + 2, yPosition)
        doc.text('Unidad', colPositions[2] + 2, yPosition)
        doc.text('Rango Normal', colPositions[3] + 2, yPosition)
        doc.text('Estado', colPositions[4] + 2, yPosition)
        
        doc.setTextColor(0, 0, 0) // Restaurar color negro
        yPosition += 8

        // Línea debajo de headers
        doc.setLineWidth(0.2)
        doc.line(startX, yPosition, startX + 170, yPosition)
        yPosition += 3

        // Datos de la tabla
        data.resultados.forEach((resultado, index) => {
          // Fondo alternado
          if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250) // Gris claro
            doc.rect(startX, yPosition - 4, 170, 6, 'F')
          }

          // Verificar si el valor está dentro del rango normal
          const rangoNormal = resultado.rangoNormal
          const valor = resultado.valor
          let estado = 'Normal'
          let estadoColor = [40, 167, 69] // Verde

          // Parsear rango normal (formato: "min - max")
          const rangoMatch = rangoNormal.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/)
          if (rangoMatch) {
            const min = parseFloat(rangoMatch[1])
            const max = parseFloat(rangoMatch[2])
            
            if (valor < min || valor > max) {
              estado = 'Fuera de Rango'
              estadoColor = [220, 53, 69] // Rojo
            }
          }

          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          
          // Truncar texto si es muy largo
          const elementoText = doc.splitTextToSize(resultado.elemento.replace('_', ' '), colWidths[0] - 2)
          doc.text(elementoText[0], colPositions[0] + 2, yPosition)
          doc.text(valor.toString(), colPositions[1] + 2, yPosition)
          doc.text(resultado.unidad, colPositions[2] + 2, yPosition)
          doc.text(rangoNormal, colPositions[3] + 2, yPosition)
          
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2])
          doc.text(estado, colPositions[4] + 2, yPosition)
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'normal')
          
          yPosition += 6

          // Nueva página si es necesario
          if (yPosition > 250 && index < data.resultados.length - 1) {
            doc.addPage()
            yPosition = 20
          }
        })

        // Línea final de la tabla
        doc.setLineWidth(0.2)
        doc.line(startX, yPosition, startX + 170, yPosition)
        yPosition += 5
      }

      yPosition += 5

      // Observaciones
      if (data.comanda.observaciones) {
        if (yPosition > 240) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('OBSERVACIONES', 20, yPosition)
        yPosition += 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const observacionesLines = doc.splitTextToSize(data.comanda.observaciones, 170)
        doc.text(observacionesLines, 25, yPosition)
        yPosition += observacionesLines.length * 5 + 5
      }

      // Footer con firma digital
      const pageHeight = doc.internal.pageSize.height
      const footerY = pageHeight - 30

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Este documento es confidencial y solo puede ser utilizado por el paciente.', 105, footerY, { align: 'center' })
      doc.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 105, footerY + 5, { align: 'center' })

      // Firma digital del responsable sanitario
      if (data.laboratorioInfo.responsableSanitario) {
        const signatureY = footerY + 15
        
        // Línea de firma
        doc.setLineWidth(0.3)
        doc.line(20, signatureY, 190, signatureY)
        
        // Nombre del responsable sanitario
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(data.laboratorioInfo.responsableSanitario, 105, signatureY + 5, { align: 'center' })
        
        // Texto "Responsable Sanitario"
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('Responsable Sanitario', 105, signatureY + 10, { align: 'center' })
        
        // Sello de autenticidad
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.text('Documento firmado digitalmente', 105, signatureY + 15, { align: 'center' })
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 105, signatureY + 20, { align: 'center' })
      }

      // Convertir a Buffer
      const pdfOutput = doc.output('arraybuffer')
      const buffer = Buffer.from(pdfOutput)
      resolve(buffer)

    } catch (error: any) {
      console.error('Error al generar PDF de resultados:', error)
      console.error('Stack:', error.stack)
      reject(error)
    }
  })
}

export function generateComandaPDF(comanda: Comanda, laboratorioInfo: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPosition = 20

      // Header del laboratorio
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(laboratorioInfo.nombre, 105, yPosition, { align: 'center' })
      yPosition += 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(laboratorioInfo.direccion, 105, yPosition, { align: 'center' })
      yPosition += 5
      doc.text(`Tel: ${laboratorioInfo.telefono}`, 105, yPosition, { align: 'center' })
      yPosition += 10

      // Título
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('ORDEN DE LABORATORIO', 105, yPosition, { align: 'center' })
      yPosition += 10

      // Información de la orden
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Número de Orden: ${comanda.numeroComanda}`, 20, yPosition)
      yPosition += 7
      doc.text(`Fecha: ${new Date(comanda.fechaCreacion).toLocaleDateString('es-ES')}`, 20, yPosition)
      yPosition += 10

      // Información del paciente
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('PACIENTE', 20, yPosition)
      yPosition += 7

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Nombre: ${comanda.cliente?.nombre || 'N/A'} ${comanda.cliente?.apellido || 'N/A'}`, 20, yPosition)
      yPosition += 5
      doc.text(`Email: ${comanda.cliente?.email || 'N/A'}`, 20, yPosition)
      yPosition += 5

      if (comanda.cliente?.telefono) {
        doc.text(`Teléfono: ${comanda.cliente.telefono}`, 20, yPosition)
        yPosition += 5
      }

      yPosition += 5

      // Información de la prueba
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('PRUEBAS SOLICITADAS', 20, yPosition)
      yPosition += 7

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Tipo: ${comanda.tipoPrueba?.nombre || 'N/A'}`, 20, yPosition)
      yPosition += 5
      doc.text('Elementos:', 20, yPosition)
      yPosition += 5
      
      comanda.elementos.forEach(elemento => {
        doc.text(`• ${elemento.replace('_', ' ')}`, 25, yPosition)
        yPosition += 5
      })

      if (comanda.observaciones) {
        yPosition += 3
        doc.text(`Observaciones: ${comanda.observaciones}`, 20, yPosition)
        yPosition += 5
      }

      // Footer
      const pageHeight = doc.internal.pageSize.height
      const footerY = pageHeight - 20
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Esta orden fue generada automáticamente por el sistema de gestión de laboratorio.', 105, footerY, { align: 'center' })
      doc.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 105, footerY + 5, { align: 'center' })

      // Convertir a Buffer
      const pdfOutput = doc.output('arraybuffer')
      const buffer = Buffer.from(pdfOutput)
      resolve(buffer)

    } catch (error: any) {
      console.error('Error al generar PDF de comanda:', error)
      console.error('Stack:', error.stack)
      reject(error)
    }
  })
}
