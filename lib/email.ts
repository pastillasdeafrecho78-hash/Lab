interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

type NodemailerTransporter = {
  sendMail: (options: {
    from: string
    to: string
    subject: string
    text: string
    html: string
  }) => Promise<{ messageId?: string }>
}

type NodemailerModule = {
  createTransport: (config: Record<string, unknown>) => NodemailerTransporter
}

let nodemailerModule: NodemailerModule | null | undefined = undefined
let transporter: NodemailerTransporter | null = null

function loadNodemailer(): NodemailerModule | null {
  if (nodemailerModule !== undefined) {
    return nodemailerModule
  }

  try {
    const dynamicRequire = (eval('require') as (moduleName: string) => any)
    const mod = dynamicRequire('nodemailer')
    nodemailerModule = mod?.default ?? mod
  } catch (error) {
    console.warn(
      'nodemailer no está instalado o disponible. El envío de emails permanecerá deshabilitado.',
      error
    )
    nodemailerModule = null
  }

  return nodemailerModule
}

/**
 * Inicializa el transporter de email
 */
function getTransporter(): NodemailerTransporter | null {
  if (transporter) {
    return transporter
  }

  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('Configuración de SMTP no encontrada. El envío de emails está deshabilitado.')
    return null
  }

  const nodemailer = loadNodemailer()
  if (!nodemailer) {
    console.warn('nodemailer no disponible. No se enviarán correos electrónicos.')
    return null
  }

  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    })

    return transporter
  } catch (error) {
    console.error('Error al configurar transporter de email:', error)
    return null
  }
}

/**
 * Envía un email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const emailTransporter = getTransporter()

  if (!emailTransporter) {
    console.warn('No se puede enviar email: transporter no configurado')
    return false
  }

  try {
    const info = await emailTransporter.sendMail({
      from: `"Laboratorio Comandas" <${process.env.SMTP_USER ?? 'no-reply@laboratorio.com'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      html: options.html
    })

    if (info?.messageId) {
      console.log('Email enviado:', info.messageId)
    }

    return true
  } catch (error) {
    console.error('Error al enviar email:', error)
    return false
  }
}

/**
 * Envía email de notificación cuando una comanda está lista
 */
export async function sendComandaCompletadaEmail(
  clienteEmail: string,
  clienteNombre: string,
  numeroComanda: string,
  pdfUrl?: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Resultados de Laboratorio Listos</h1>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p>Le informamos que los resultados de su comanda <strong>${numeroComanda}</strong> están listos.</p>
          <p>Puede descargar los resultados desde el sistema o acudir a nuestra sucursal para recogerlos.</p>
          ${pdfUrl ? `<p><a href="${pdfUrl}" class="button">Descargar Resultados</a></p>` : ''}
          <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
          <p>Atentamente,<br>Equipo del Laboratorio</p>
        </div>
        <div class="footer">
          <p>Este es un email automático, por favor no responda a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: clienteEmail,
    subject: `Resultados Listos - Comanda ${numeroComanda}`,
    html
  })
}

/**
 * Envía email de confirmación cuando se crea una comanda
 */
export async function sendComandaCreadaEmail(
  clienteEmail: string,
  clienteNombre: string,
  numeroComanda: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Comanda Registrada</h1>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p>Su comanda <strong>${numeroComanda}</strong> ha sido registrada exitosamente.</p>
          <p>Le notificaremos cuando los resultados estén listos.</p>
          <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
          <p>Atentamente,<br>Equipo del Laboratorio</p>
        </div>
        <div class="footer">
          <p>Este es un email automático, por favor no responda a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: clienteEmail,
    subject: `Comanda Registrada - ${numeroComanda}`,
    html
  })
}

