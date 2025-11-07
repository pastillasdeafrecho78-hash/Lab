import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getUserFromToken } from '@/lib/auth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']

// POST - Subir archivo
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requerido' }, { status: 401 })
    }

    const user = await getUserFromToken(token)

    // Verificar permisos
    if (!['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION'].includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para subir archivos' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'El archivo es demasiado grande. Máximo 10MB' },
        { status: 400 }
      )
    }

    // Validar tipo
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
    const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type)

    if (!isImage && !isDocument) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no permitido' },
        { status: 400 }
      )
    }

    // Crear directorio de uploads si no existe
    const uploadDir = join(process.cwd(), 'uploads', 'chat')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generar nombre único
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${extension}`
    const filePath = join(uploadDir, fileName)

    // Guardar archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Determinar tipo de archivo
    const tipoArchivo = isImage ? 'imagen' : 'documento'

    // URL relativa para acceder al archivo
    const fileUrl = `/uploads/chat/${fileName}`

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        tipo: tipoArchivo,
        nombre: file.name,
        tamaño: file.size,
        mimeType: file.type
      },
      message: 'Archivo subido exitosamente'
    })

  } catch (error: any) {
    console.error('Error al subir archivo:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

