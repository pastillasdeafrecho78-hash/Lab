import PDFDocument from 'pdfkit';
import { Comanda, Resultado, Cliente, Sucursal } from '../types';

export class PDFService {
  private doc: PDFDocument;

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });
  }

  generateResultadoPDF(
    comanda: Comanda,
    resultados: Resultado[],
    cliente: Cliente,
    sucursal: Sucursal
  ): Buffer {
    const buffers: Buffer[] = [];
    
    this.doc.on('data', (chunk) => buffers.push(chunk));
    
    return new Promise((resolve, reject) => {
      this.doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      this.doc.on('error', reject);

      try {
        this.createHeader(sucursal);
        this.createClienteInfo(cliente);
        this.createComandaInfo(comanda);
        this.createResultadosTable(resultados);
        this.createFooter();
        
        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private createHeader(sucursal: Sucursal) {
    // Logo placeholder (en producción, cargar logo real)
    this.doc.rect(50, 50, 100, 30)
      .fill('#f0f0f0');
    
    this.doc.fontSize(12)
      .fillColor('#666')
      .text('LOGO', 70, 65);

    // Información del laboratorio
    this.doc.fontSize(16)
      .fillColor('#000')
      .text(sucursal.nombre, 200, 60, { align: 'center' });

    this.doc.fontSize(12)
      .fillColor('#666')
      .text(sucursal.direccion, 200, 80, { align: 'center' });

    this.doc.text(`Tel: ${sucursal.telefono}`, 200, 95, { align: 'center' });
    
    if (sucursal.email) {
      this.doc.text(`Email: ${sucursal.email}`, 200, 110, { align: 'center' });
    }

    // Línea separadora
    this.doc.moveTo(50, 130)
      .lineTo(550, 130)
      .stroke('#000');

    // Título del reporte
    this.doc.fontSize(18)
      .fillColor('#000')
      .text('RESULTADOS DE LABORATORIO', 50, 150, { align: 'center' });
  }

  private createClienteInfo(cliente: Cliente) {
    this.doc.fontSize(14)
      .fillColor('#000')
      .text('INFORMACIÓN DEL PACIENTE', 50, 200);

    this.doc.fontSize(12)
      .fillColor('#333')
      .text(`Nombre: ${cliente.nombre} ${cliente.apellido}`, 50, 230)
      .text(`Email: ${cliente.email}`, 50, 250)
      .text(`Teléfono: ${cliente.telefono}`, 50, 270)
      .text(`Fecha de Nacimiento: ${new Date(cliente.fechaNacimiento).toLocaleDateString('es-MX')}`, 50, 290)
      .text(`Género: ${cliente.genero === 'M' ? 'Masculino' : cliente.genero === 'F' ? 'Femenino' : 'Otro'}`, 50, 310);

    if (cliente.direccion) {
      this.doc.text(`Dirección: ${cliente.direccion}`, 50, 330);
    }
  }

  private createComandaInfo(comanda: Comanda) {
    this.doc.fontSize(14)
      .fillColor('#000')
      .text('INFORMACIÓN DE LA COMANDA', 50, 380);

    this.doc.fontSize(12)
      .fillColor('#333')
      .text(`Número de Comanda: ${comanda.numeroComanda}`, 50, 410)
      .text(`Tipo de Prueba: ${comanda.tipoPrueba}`, 50, 430)
      .text(`Fecha de Creación: ${new Date(comanda.fechaCreacion).toLocaleDateString('es-MX')}`, 50, 450)
      .text(`Estado: ${comanda.estado}`, 50, 470);

    if (comanda.observaciones) {
      this.doc.text(`Observaciones: ${comanda.observaciones}`, 50, 490);
    }
  }

  private createResultadosTable(resultados: Resultado[]) {
    this.doc.fontSize(14)
      .fillColor('#000')
      .text('RESULTADOS', 50, 540);

    // Headers de la tabla
    const tableTop = 570;
    const col1 = 50;
    const col2 = 200;
    const col3 = 300;
    const col4 = 400;
    const col5 = 500;

    this.doc.fontSize(10)
      .fillColor('#000')
      .text('Elemento', col1, tableTop)
      .text('Valor', col2, tableTop)
      .text('Unidad', col3, tableTop)
      .text('Rango Normal', col4, tableTop)
      .text('Estado', col5, tableTop);

    // Línea de header
    this.doc.moveTo(col1, tableTop + 15)
      .lineTo(col5 + 50, tableTop + 15)
      .stroke('#000');

    // Datos de la tabla
    let yPosition = tableTop + 25;
    
    resultados.forEach((resultado) => {
      if (yPosition > 700) {
        // Nueva página si es necesario
        this.doc.addPage();
        yPosition = 50;
      }

      this.doc.fontSize(10)
        .fillColor('#333')
        .text(resultado.elemento, col1, yPosition)
        .text(resultado.valor.toString(), col2, yPosition)
        .text(resultado.unidad, col3, yPosition)
        .text(`${resultado.rangoNormal.min} - ${resultado.rangoNormal.max}`, col4, yPosition);

      // Estado con color
      this.doc.fillColor(resultado.esNormal ? '#22c55e' : '#ef4444')
        .text(resultado.esNormal ? 'Normal' : 'Anormal', col5, yPosition);

      if (resultado.observaciones) {
        this.doc.fillColor('#666')
          .fontSize(8)
          .text(`Obs: ${resultado.observaciones}`, col1, yPosition + 12);
        yPosition += 25;
      } else {
        yPosition += 20;
      }
    });
  }

  private createFooter() {
    const pageHeight = this.doc.page.height;
    const footerY = pageHeight - 100;

    // Línea separadora
    this.doc.moveTo(50, footerY)
      .lineTo(550, footerY)
      .stroke('#ccc');

    // Información del pie de página
    this.doc.fontSize(10)
      .fillColor('#666')
      .text('Este reporte fue generado automáticamente por el Sistema de Gestión de Comandas', 50, footerY + 10, { align: 'center' })
      .text(`Fecha de generación: ${new Date().toLocaleString('es-MX')}`, 50, footerY + 25, { align: 'center' })
      .text('Los resultados deben ser interpretados por un profesional médico', 50, footerY + 40, { align: 'center' });
  }

  // Método para generar PDF de comanda (sin resultados)
  generateComandaPDF(comanda: Comanda, cliente: Cliente, sucursal: Sucursal): Buffer {
    const buffers: Buffer[] = [];
    
    this.doc.on('data', (chunk) => buffers.push(chunk));
    
    return new Promise((resolve, reject) => {
      this.doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      this.doc.on('error', reject);

      try {
        this.createHeader(sucursal);
        this.createClienteInfo(cliente);
        this.createComandaInfo(comanda);
        this.createComandaElements(comanda);
        this.createFooter();
        
        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private createComandaElements(comanda: Comanda) {
    this.doc.fontSize(14)
      .fillColor('#000')
      .text('ELEMENTOS SOLICITADOS', 50, 540);

    const tableTop = 570;
    const col1 = 50;
    const col2 = 200;

    this.doc.fontSize(10)
      .fillColor('#000')
      .text('Elemento', col1, tableTop)
      .text('Descripción', col2, tableTop);

    // Línea de header
    this.doc.moveTo(col1, tableTop + 15)
      .lineTo(col2 + 200, tableTop + 15)
      .stroke('#000');

    // Elementos
    let yPosition = tableTop + 25;
    
    comanda.elementos.forEach((elemento) => {
      this.doc.fontSize(10)
        .fillColor('#333')
        .text(elemento, col1, yPosition)
        .text('Análisis clínico', col2, yPosition);
      
      yPosition += 20;
    });
  }
}

export const pdfService = new PDFService();
