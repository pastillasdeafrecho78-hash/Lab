import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token no proporcionado' },
        { status: 401 }
      )
    }

    const user = await getUserFromToken(token)

    return NextResponse.json({
      success: true,
      data: user
    })

  } catch (error: any) {
    console.error('Error al obtener usuario:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Token inválido' 
      },
      { status: 401 }
    )
  }
}
