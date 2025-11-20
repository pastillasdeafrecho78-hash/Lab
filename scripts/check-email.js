const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkEmail() {
  try {
    const users = await prisma.usuario.findMany({
      where: { email: { contains: 'admin' } }
    })
    
    users.forEach(u => {
      console.log(`Email en BD: "${u.email}"`)
      console.log(`  Lowercase: "${u.email.toLowerCase()}"`)
      console.log(`  Trimmed: "${u.email.trim()}"`)
      console.log(`  Normalized: "${u.email.trim().toLowerCase()}"`)
      console.log('')
    })
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkEmail()

