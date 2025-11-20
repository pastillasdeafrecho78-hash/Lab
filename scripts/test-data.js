const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestData() {
  try {
    console.log('🧪 Creando datos de prueba...')

    // Obtener sucursal existente
    const sucursal = await prisma.sucursal.findFirst()
    if (!sucursal) {
      console.log('❌ No se encontró sucursal. Ejecuta primero create-admin.js')
      return
    }

    // Crear usuarios de prueba
    const usuarios = [
      {
        email: 'recepcion@laboratorio.com',
        nombre: 'María',
        apellido: 'González',
        rol: 'RECEPCION',
        password: await bcrypt.hash('recepcion123', 12)
      },
      {
        email: 'tecnico@laboratorio.com',
        nombre: 'Carlos',
        apellido: 'Rodríguez',
        rol: 'TECNICO_LABORATORIO',
        password: await bcrypt.hash('tecnico123', 12)
      },
      {
        email: 'responsable@laboratorio.com',
        nombre: 'Ana',
        apellido: 'Martínez',
        rol: 'RESPONSABLE_SUCURSAL',
        password: await bcrypt.hash('responsable123', 12)
      }
    ]

    for (const usuarioData of usuarios) {
      const usuario = await prisma.usuario.create({
        data: usuarioData
      })

      // Asignar a sucursal
      await prisma.usuarioSucursal.create({
        data: {
          usuarioId: usuario.id,
          sucursalId: sucursal.id
        }
      })

      console.log(`✅ Usuario creado: ${usuarioData.email} (${usuarioData.rol})`)
    }

    // Crear clientes de prueba
    const clientes = [
      {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan.perez@email.com',
        telefono: '555-1234',
        fechaNacimiento: new Date('1985-06-15'),
        genero: 'M',
        direccion: 'Calle Principal 123, Ciudad'
      },
      {
        nombre: 'María',
        apellido: 'López',
        email: 'maria.lopez@email.com',
        telefono: '555-5678',
        fechaNacimiento: new Date('1990-03-22'),
        genero: 'F',
        direccion: 'Avenida Central 456, Ciudad'
      },
      {
        nombre: 'Pedro',
        apellido: 'García',
        email: 'pedro.garcia@email.com',
        telefono: '555-9012',
        fechaNacimiento: new Date('1978-11-08'),
        genero: 'M',
        direccion: 'Plaza Mayor 789, Ciudad'
      }
    ]

    for (const clienteData of clientes) {
      const cliente = await prisma.cliente.create({
        data: clienteData
      })
      console.log(`✅ Cliente creado: ${cliente.nombre} ${cliente.apellido}`)
    }

    // Obtener tipos de prueba
    const tiposPrueba = await prisma.tipoPrueba.findMany()
    if (tiposPrueba.length === 0) {
      console.log('❌ No se encontraron tipos de prueba. Ejecuta primero create-admin.js')
      return
    }

    // Obtener usuario de recepción
    const recepcion = await prisma.usuario.findFirst({
      where: { rol: 'RECEPCION' }
    })

    // Crear comandas de prueba
    const clientesCreados = await prisma.cliente.findMany()
    
    for (let i = 0; i < 5; i++) {
      const cliente = clientesCreados[i % clientesCreados.length]
      const tipoPrueba = tiposPrueba[i % tiposPrueba.length]
      
      // Generar número de comanda
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const numeroComanda = `CMD-${year}${month}${day}-${String(i + 1).padStart(4, '0')}`

      const comanda = await prisma.comanda.create({
        data: {
          numeroComanda,
          clienteId: cliente.id,
          sucursalId: sucursal.id,
          tipoPruebaId: tipoPrueba.id,
          elementos: tipoPrueba.elementos,
          observaciones: `Comanda de prueba ${i + 1}`,
          creadoPorId: recepcion.id,
          estado: i < 2 ? 'PENDIENTE' : i < 4 ? 'EN_PROCESO' : 'COMPLETADA'
        }
      })

      console.log(`✅ Comanda creada: ${comanda.numeroComanda}`)

      // Crear resultados para comandas completadas
      if (comanda.estado === 'COMPLETADA') {
        const tecnico = await prisma.usuario.findFirst({
          where: { rol: 'TECNICO_LABORATORIO' }
        })

        for (const elemento of comanda.elementos) {
          // Generar valores aleatorios dentro de rangos normales
          let valor, rangoNormal, unidad
          
          switch (elemento) {
            case 'glucosa':
              valor = Math.floor(Math.random() * 30) + 70 // 70-100
              rangoNormal = '70 - 100'
              unidad = 'mg/dL'
              break
            case 'colesterol_total':
              valor = Math.floor(Math.random() * 100) + 150 // 150-250
              rangoNormal = '0 - 200'
              unidad = 'mg/dL'
              break
            case 'trigliceridos':
              valor = Math.floor(Math.random() * 100) + 50 // 50-150
              rangoNormal = '0 - 150'
              unidad = 'mg/dL'
              break
            case 'hemoglobina':
              valor = Math.floor(Math.random() * 3) + 12 // 12-15
              rangoNormal = '12 - 15'
              unidad = 'g/dL'
              break
            case 'hematocrito':
              valor = Math.floor(Math.random() * 10) + 35 // 35-45
              rangoNormal = '35 - 45'
              unidad = '%'
              break
            default:
              valor = Math.floor(Math.random() * 50) + 10
              rangoNormal = '10 - 60'
              unidad = 'mg/dL'
          }

          await prisma.resultado.create({
            data: {
              comandaId: comanda.id,
              elemento,
              valor,
              unidad,
              rangoNormal,
              observaciones: 'Resultado de prueba',
              registradoPorId: tecnico.id
            }
          })
        }

        console.log(`   📊 Resultados creados para ${comanda.numeroComanda}`)
      }
    }

    console.log('\n🎉 ¡Datos de prueba creados exitosamente!')
    console.log('\n👥 Usuarios de prueba:')
    console.log('   📧 recepcion@laboratorio.com / recepcion123')
    console.log('   📧 tecnico@laboratorio.com / tecnico123')
    console.log('   📧 responsable@laboratorio.com / responsable123')
    console.log('\n🧪 Puedes probar el sistema completo con estos datos')

  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestData()
