const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🚀 Iniciando configuración del sistema...')

    // Crear sucursal principal
    const sucursal = await prisma.sucursal.create({
      data: {
        nombre: 'Sucursal Principal',
        direccion: 'Dirección de tu laboratorio',
        telefono: 'Tu teléfono',
        email: 'tu_email@laboratorio.com'
      }
    })

    console.log('✅ Sucursal creada:', sucursal.nombre)

    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const admin = await prisma.usuario.create({
      data: {
        email: 'admin@laboratorio.com',
        nombre: 'Administrador',
        apellido: 'Sistema',
        password: hashedPassword,
        rol: 'SUPER_ADMIN'
      }
    })

    // Asignar usuario a sucursal
    await prisma.usuarioSucursal.create({
      data: {
        usuarioId: admin.id,
        sucursalId: sucursal.id
      }
    })

    console.log('✅ Usuario administrador creado:')
    console.log('   📧 Email: admin@laboratorio.com')
    console.log('   🔑 Contraseña: admin123')
    console.log('   👑 Rol: SUPER_ADMIN')

    // Crear tipos de prueba básicos
    const tiposPrueba = [
      {
        nombre: 'Química Completa 6',
        descripcion: 'Perfil químico completo con 6 elementos',
        elementos: ['glucosa', 'colesterol_total', 'trigliceridos', 'hdl_colesterol', 'ldl_colesterol', 'hemoglobina_glicosilada']
      },
      {
        nombre: 'Química Básica 3',
        descripcion: 'Perfil químico básico con 3 elementos',
        elementos: ['glucosa', 'colesterol_total', 'trigliceridos']
      },
      {
        nombre: 'Hematología Completa',
        descripcion: 'Conteo sanguíneo completo',
        elementos: ['hemoglobina', 'hematocrito', 'leucocitos', 'neutrofilos', 'linfocitos', 'monocitos', 'eosinofilos', 'basofilos', 'plaquetas']
      }
    ]

    for (const tipo of tiposPrueba) {
      await prisma.tipoPrueba.create({
        data: tipo
      })
    }

    console.log('✅ Tipos de prueba creados:')
    tiposPrueba.forEach(tipo => {
      console.log(`   🧪 ${tipo.nombre}`)
    })

    // Crear maquinaria de ejemplo
    const maquinaria = await prisma.maquinaria.create({
      data: {
        nombre: 'Analizador Químico Principal',
        modelo: 'Modelo XYZ',
        marca: 'Marca ABC',
        serie: 'SN123456',
        sucursalId: sucursal.id
      }
    })

    console.log('✅ Maquinaria creada:', maquinaria.nombre)

    // Asignar pruebas a maquinaria
    const tiposPruebaCreados = await prisma.tipoPrueba.findMany()
    
    for (const tipo of tiposPruebaCreados) {
      await prisma.pruebaMaquinaria.create({
        data: {
          tipoPruebaId: tipo.id,
          maquinariaId: maquinaria.id
        }
      })
    }

    console.log('✅ Pruebas asignadas a maquinaria')

    console.log('\n🎉 ¡Configuración completada exitosamente!')
    console.log('\n📋 Próximos pasos:')
    console.log('1. Ejecutar: npm run dev')
    console.log('2. Ir a: http://localhost:3000')
    console.log('3. Iniciar sesión con las credenciales mostradas arriba')
    console.log('4. Configurar información de tu laboratorio')
    console.log('5. Crear usuarios adicionales según necesites')

  } catch (error) {
    console.error('❌ Error durante la configuración:', error)
    
    if (error.code === 'P2002') {
      console.log('\n💡 El sistema ya está configurado. Si quieres reiniciar:')
      console.log('1. Eliminar la base de datos: DROP DATABASE laboratorio_comandas;')
      console.log('2. Crear nuevamente: CREATE DATABASE laboratorio_comandas;')
      console.log('3. Ejecutar este script nuevamente')
    }
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
