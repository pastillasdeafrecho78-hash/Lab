const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetAdminPassword() {
  try {
    console.log('🔐 Restableciendo contraseña del admin...\n')

    const hashedPassword = await bcrypt.hash('admin123', 12)

    const user = await prisma.usuario.update({
      where: { email: 'admin@laboratorio.com' },
      data: {
        password: hashedPassword,
        activo: true
      }
    })

    console.log('✅ Contraseña restablecida exitosamente')
    console.log(`   Email: ${user.email}`)
    console.log(`   Contraseña: admin123`)
    console.log(`   Estado: ${user.activo ? 'ACTIVO' : 'INACTIVO'}`)

  } catch (error) {
    if (error.code === 'P2025') {
      console.log('❌ Usuario no encontrado')
      console.log('💡 Ejecuta primero: node scripts/create-admin.js')
    } else {
      console.error('❌ Error:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()

