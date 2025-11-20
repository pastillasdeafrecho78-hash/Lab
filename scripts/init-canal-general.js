const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Inicializando canal general...')

  // Buscar o crear canal general
  let canalGeneral = await prisma.canal.findFirst({
    where: {
      categoria: 'GENERAL',
      nombre: { equals: 'general', mode: 'insensitive' }
    }
  })

  if (!canalGeneral) {
    // Buscar un super admin para asignarlo como creador
    const superAdmin = await prisma.usuario.findFirst({
      where: {
        rol: 'SUPER_ADMIN',
        activo: true
      }
    })

    if (!superAdmin) {
      console.error('No se encontró un SUPER_ADMIN. Por favor, crea uno primero.')
      process.exit(1)
    }

    canalGeneral = await prisma.canal.create({
      data: {
        nombre: 'general',
        descripcion: 'Canal general para todos los usuarios',
        categoria: 'GENERAL',
        tipo: 'TEXTO',
        orden: 0,
        creadoPorId: superAdmin.id
      }
    })

    console.log('✅ Canal general creado:', canalGeneral.id)

    // Crear permisos por defecto para todos los roles
    const roles = ['SUPER_ADMIN', 'RESPONSABLE_SANITARIO', 'RESPONSABLE_SUCURSAL', 'TECNICO_LABORATORIO', 'RECEPCION']
    
    for (const rol of roles) {
      await prisma.canalPermiso.upsert({
        where: {
          canalId_rol: {
            canalId: canalGeneral.id,
            rol: rol
          }
        },
        update: {
          puedeVer: true,
          puedeEscribir: true,
          puedeAdministrar: rol === 'SUPER_ADMIN' || rol === 'RESPONSABLE_SANITARIO'
        },
        create: {
          canalId: canalGeneral.id,
          rol: rol,
          puedeVer: true,
          puedeEscribir: true,
          puedeAdministrar: rol === 'SUPER_ADMIN' || rol === 'RESPONSABLE_SANITARIO'
        }
      })
    }

    console.log('✅ Permisos del canal general configurados')
  } else {
    console.log('ℹ️  Canal general ya existe:', canalGeneral.id)
  }

  // Migrar mensajes existentes sin canalId al canal general
  const mensajesSinCanal = await prisma.mensaje.findMany({
    where: {
      canalId: null
    }
  })

  if (mensajesSinCanal.length > 0) {
    console.log(`Migrando ${mensajesSinCanal.length} mensajes al canal general...`)
    
    await prisma.mensaje.updateMany({
      where: {
        canalId: null
      },
      data: {
        canalId: canalGeneral.id
      }
    })

    console.log('✅ Mensajes migrados al canal general')
  } else {
    console.log('ℹ️  No hay mensajes sin canal para migrar')
  }

  console.log('✅ Inicialización completada')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

