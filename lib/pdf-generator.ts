import PDFDocument from 'pdfkit'
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
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      })

      const buffers: Buffer[] = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers)
        resolve(pdfData)
      })

      // Header del laboratorio
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text(data.laboratorioInfo.nombre, { align: 'center' })
        .moveDown(0.5)

      doc.fontSize(10)
        .font('Helvetica')
        .text(data.laboratorioInfo.direccion, { align: 'center' })
        .text(`Tel: ${data.laboratorioInfo.telefono}`, { align: 'center' })
        
      if (data.laboratorioInfo.email) {
        doc.text(`Email: ${data.laboratorioInfo.email}`, { align: 'center' })
      }
      
      if (data.laboratorioInfo.rfc) {
        doc.text(`RFC: ${data.laboratorioInfo.rfc}`, { align: 'center' })
      }

      doc.moveDown(1)

      // Línea separadora
      doc.moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()

      doc.moveDown(1)

      // Título del reporte
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('RESULTADOS DE LABORATORIO', { align: 'center' })
        .moveDown(1)

      // Información de la comanda
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('INFORMACIÓN DE LA ORDEN', { underline: true })
        .moveDown(0.5)

      doc.fontSize(10)
        .font('Helvetica')
        .text(`Número de Orden: ${data.comanda.numeroComanda}`, { indent: 20 })
        .text(`Fecha: ${new Date(data.comanda.fechaCreacion).toLocaleDateString('es-ES')}`, { indent: 20 })
        .text(`Sucursal: ${data.comanda.sucursal?.nombre || 'N/A'}`, { indent: 20 })
        .moveDown(1)

      // Información del paciente
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('INFORMACIÓN DEL PACIENTE', { underline: true })
        .moveDown(0.5)

      doc.fontSize(10)
        .font('Helvetica')
        .text(`Nombre: ${data.comanda.cliente?.nombre || 'N/A'} ${data.comanda.cliente?.apellido || 'N/A'}`, { indent: 20 })
        .text(`Email: ${data.comanda.cliente?.email || 'N/A'}`, { indent: 20 })
        
      if (data.comanda.cliente?.telefono) {
        doc.text(`Teléfono: ${data.comanda.cliente.telefono}`, { indent: 20 })
      }
        
      if (data.comanda.cliente?.fechaNacimiento) {
        doc.text(`Fecha de Nacimiento: ${new Date(data.comanda.cliente.fechaNacimiento).toLocaleDateString('es-ES')}`, { indent: 20 })
      }

      doc.moveDown(1)

      // Información de la prueba
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('INFORMACIÓN DE LA PRUEBA', { underline: true })
        .moveDown(0.5)

      doc.fontSize(10)
        .font('Helvetica')
        .text(`Tipo de Prueba: ${data.comanda.tipoPrueba?.nombre || 'N/A'}`, { indent: 20 })
        .text(`Elementos Analizados: ${data.comanda.elementos.length}`, { indent: 20 })
        .text(`Estado: ${data.comanda.estado.replace('_', ' ')}`, { indent: 20 })

      if (data.comanda.fechaCompletado) {
        doc.text(`Fecha de Completado: ${new Date(data.comanda.fechaCompletado).toLocaleDateString('es-ES')}`, { indent: 20 })
      }

      doc.moveDown(1)

      // Resultados
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('RESULTADOS', { underline: true })
        .moveDown(0.5)

      if (data.resultados.length === 0) {
        doc.fontSize(10)
          .font('Helvetica')
          .text('No hay resultados disponibles', { indent: 20 })
      } else {
        // Crear tabla de resultados
        const tableTop = doc.y
        const itemHeight = 20
        const col1 = 50
        const col2 = 200
        const col3 = 300
        const col4 = 400
        const col5 = 500

        // Headers de la tabla
        doc.fontSize(9)
          .font('Helvetica-Bold')
          .text('Elemento', col1, tableTop)
          .text('Valor', col2, tableTop)
          .text('Unidad', col3, tableTop)
          .text('Rango Normal', col4, tableTop)
          .text('Estado', col5, tableTop)

        // Línea debajo de los headers
        doc.moveTo(col1, tableTop + 15)
          .lineTo(550, tableTop + 15)
          .stroke()

        // Datos de la tabla
        data.resultados.forEach((resultado, index) => {
          const y = tableTop + 20 + (index * itemHeight)
          
          // Verificar si el valor está dentro del rango normal
          const rangoNormal = resultado.rangoNormal
          const valor = resultado.valor
          let estado = 'Normal'
          let color = '#000000'

          // Parsear rango normal (formato: "min - max")
          const rangoMatch = rangoNormal.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/)
          if (rangoMatch) {
            const min = parseFloat(rangoMatch[1])
            const max = parseFloat(rangoMatch[2])
            
            if (valor < min || valor > max) {
              estado = 'Fuera de Rango'
              color = '#FF0000'
            }
          }

          doc.fontSize(8)
            .font('Helvetica')
            .fillColor('#000000')
            .text(resultado.elemento.replace('_', ' '), col1, y)
            .text(valor.toString(), col2, y)
            .text(resultado.unidad, col3, y)
            .text(rangoNormal, col4, y)
            .fillColor(color)
            .text(estado, col5, y)
        })
      }

      doc.moveDown(2)

      // Observaciones
      if (data.comanda.observaciones) {
        doc.fontSize(12)
          .font('Helvetica-Bold')
          .text('OBSERVACIONES', { underline: true })
          .moveDown(0.5)

        doc.fontSize(10)
          .font('Helvetica')
          .text(data.comanda.observaciones, { indent: 20 })
          .moveDown(1)
      }

      // Footer con firma digital
      const footerY = doc.page.height - 120
      doc.fontSize(8)
        .font('Helvetica')
        .text('Este documento es confidencial y solo puede ser utilizado por el paciente.', 50, footerY, { align: 'center' })
        .text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 50, footerY + 15, { align: 'center' })

      // Firma digital del responsable sanitario
      if (data.laboratorioInfo.responsableSanitario) {
        const signatureY = footerY + 40
        
        // Línea de firma
        doc.moveTo(50, signatureY)
          .lineTo(550, signatureY)
          .stroke()
        
        // Nombre del responsable sanitario
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .text(data.laboratorioInfo.responsableSanitario, 50, signatureY + 5, { align: 'center' })
        
        // Texto "Responsable Sanitario"
        doc.fontSize(8)
          .font('Helvetica')
          .text('Responsable Sanitario', 50, signatureY + 20, { align: 'center' })
        
        // Sello de autenticidad
        doc.fontSize(7)
          .font('Helvetica-Oblique')
          .text('Documento firmado digitalmente', 50, signatureY + 35, { align: 'center' })
          .text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 50, signatureY + 45, { align: 'center' })
      }

      // Finalizar el documento
      doc.end()

    } catch (error) {
      reject(error)
    }
  })
}

export function generateComandaPDF(comanda: Comanda, laboratorioInfo: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      })

      const buffers: Buffer[] = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers)
        resolve(pdfData)
      })

      // Header del laboratorio
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text(laboratorioInfo.nombre, { align: 'center' })
        .moveDown(0.5)

      doc.fontSize(10)
        .font('Helvetica')
        .text(laboratorioInfo.direccion, { align: 'center' })
        .text(`Tel: ${laboratorioInfo.telefono}`, { align: 'center' })

      doc.moveDown(1)

      // Título
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('ORDEN DE LABORATORIO', { align: 'center' })
        .moveDown(1)

      // Información de la orden
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text(`Número de Orden: ${comanda.numeroComanda}`)
        .text(`Fecha: ${new Date(comanda.fechaCreacion).toLocaleDateString('es-ES')}`)
        .moveDown(1)

      // Información del paciente
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('PACIENTE')
        .moveDown(0.5)

      doc.fontSize(10)
        .font('Helvetica')
        .text(`Nombre: ${comanda.cliente?.nombre || 'N/A'} ${comanda.cliente?.apellido || 'N/A'}`)
        .text(`Email: ${comanda.cliente?.email || 'N/A'}`)

      if (comanda.cliente?.telefono) {
        doc.text(`Teléfono: ${comanda.cliente.telefono}`)
      }

      doc.moveDown(1)

      // Información de la prueba
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('PRUEBAS SOLICITADAS')
        .moveDown(0.5)

      doc.fontSize(10)
        .font('Helvetica')
        .text(`Tipo: ${comanda.tipoPrueba?.nombre || 'N/A'}`)
        .text('Elementos:')
        
      comanda.elementos.forEach(elemento => {
        doc.text(`• ${elemento.replace('_', ' ')}`, { indent: 20 })
      })

      if (comanda.observaciones) {
        doc.moveDown(0.5)
        .text(`Observaciones: ${comanda.observaciones}`)
      }

      doc.moveDown(2)

      // Footer
      const footerY = doc.page.height - 100
      doc.fontSize(8)
        .font('Helvetica')
        .text('Esta orden fue generada automáticamente por el sistema de gestión de laboratorio.', 50, footerY, { align: 'center' })
        .text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 50, footerY + 15, { align: 'center' })

      doc.end()

    } catch (error) {
      reject(error)
    }
  })
}
