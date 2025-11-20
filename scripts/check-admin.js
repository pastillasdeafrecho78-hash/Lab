const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkAdmin() {
  try {
    console.log('🔍 Verificando usuario admin...\n')

    const user = await prisma.usuario.findUnique({
      where: { email: 'admin@laboratorio.com' },
      include: {
        sucursales: {
          include: {
            sucursal: true
          }
        }
      }
    })

    if (!user) {
      console.log('❌ Usuario NO encontrado')
      console.log('💡 Ejecuta: node scripts/create-admin.js')
      return
    }

    console.log('✅ Usuario encontrado:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Nombre: ${user.nombre} ${user.apellido}`)
    console.log(`   Rol: ${user.rol}`)
    console.log(`   Activo: ${user.activo}`)
    console.log(`   Longitud de contraseña: ${user.password.length} caracteres`)
    console.log(`   Sucursales asignadas: ${user.sucursales.length}`)

    // Verificar contraseña
    const testPassword = 'admin123'
    const isValid = await bcrypt.compare(testPassword, user.password)
    console.log(`\n🔐 Verificación de contraseña: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`)

    if (!isValid) {
      console.log('\n⚠️  La contraseña no coincide. ¿Deseas actualizarla?')
      console.log('   Ejecuta: node scripts/reset-admin-password.js')
    }

    if (!user.activo) {
      console.log('\n⚠️  El usuario está INACTIVO. Esto podría ser el problema.')
      console.log('   Ejecuta: node scripts/activate-admin.js')
    }

    if (user.sucursales.length === 0) {
      console.log('\n⚠️  El usuario no tiene sucursales asignadas.')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdmin()

