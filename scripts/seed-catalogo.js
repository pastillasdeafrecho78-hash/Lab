const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Analitos estándar de laboratorio
const ANALITOS_STANDARD = [
  // Química Clínica
  { nombre: 'Glucosa', unidad: 'mg/dL', descripcion: 'Glucosa en ayunas' },
  { nombre: 'Colesterol Total', unidad: 'mg/dL', descripcion: 'Colesterol total en sangre' },
  { nombre: 'Trigliceridos', unidad: 'mg/dL', descripcion: 'Triglicéridos en sangre' },
  { nombre: 'HDL Colesterol', unidad: 'mg/dL', descripcion: 'Colesterol de lipoproteínas de alta densidad' },
  { nombre: 'LDL Colesterol', unidad: 'mg/dL', descripcion: 'Colesterol de lipoproteínas de baja densidad' },
  { nombre: 'Hemoglobina Glicosilada', unidad: '%', descripcion: 'HbA1c - Control glucémico' },
  { nombre: 'Creatinina', unidad: 'mg/dL', descripcion: 'Función renal' },
  { nombre: 'Acido Urico', unidad: 'mg/dL', descripcion: 'Ácido úrico en sangre' },
  { nombre: 'Urea', unidad: 'mg/dL', descripcion: 'Urea en sangre' },
  { nombre: 'Bilirrubina Total', unidad: 'mg/dL', descripcion: 'Bilirrubina total' },
  { nombre: 'Bilirrubina Directa', unidad: 'mg/dL', descripcion: 'Bilirrubina conjugada' },
  { nombre: 'Bilirrubina Indirecta', unidad: 'mg/dL', descripcion: 'Bilirrubina no conjugada' },
  { nombre: 'AST (TGO)', unidad: 'U/L', descripcion: 'Aspartato aminotransferasa' },
  { nombre: 'ALT (TGP)', unidad: 'U/L', descripcion: 'Alanina aminotransferasa' },
  { nombre: 'Fosfatasa Alcalina', unidad: 'U/L', descripcion: 'Fosfatasa alcalina' },
  { nombre: 'Albumina', unidad: 'g/dL', descripcion: 'Albúmina sérica' },
  { nombre: 'Proteínas Totales', unidad: 'g/dL', descripcion: 'Proteínas totales en suero' },
  { nombre: 'Calcio', unidad: 'mg/dL', descripcion: 'Calcio sérico' },
  { nombre: 'Fosforo', unidad: 'mg/dL', descripcion: 'Fósforo sérico' },
  { nombre: 'Magnesio', unidad: 'mg/dL', descripcion: 'Magnesio sérico' },
  { nombre: 'Sodio', unidad: 'mEq/L', descripcion: 'Sodio sérico' },
  { nombre: 'Potasio', unidad: 'mEq/L', descripcion: 'Potasio sérico' },
  { nombre: 'Cloro', unidad: 'mEq/L', descripcion: 'Cloro sérico' },
  
  // Hematología
  { nombre: 'Hemoglobina', unidad: 'g/dL', descripcion: 'Hemoglobina en sangre' },
  { nombre: 'Hematocrito', unidad: '%', descripcion: 'Porcentaje de hematocrito' },
  { nombre: 'Leucocitos', unidad: 'x10³/µL', descripcion: 'Recuento de glóbulos blancos' },
  { nombre: 'Neutrofilos', unidad: '%', descripcion: 'Neutrófilos en diferencial' },
  { nombre: 'Linfocitos', unidad: '%', descripcion: 'Linfocitos en diferencial' },
  { nombre: 'Monocitos', unidad: '%', descripcion: 'Monocitos en diferencial' },
  { nombre: 'Eosinofilos', unidad: '%', descripcion: 'Eosinófilos en diferencial' },
  { nombre: 'Basofilos', unidad: '%', descripcion: 'Basófilos en diferencial' },
  { nombre: 'Plaquetas', unidad: 'x10³/µL', descripcion: 'Recuento de plaquetas' },
  { nombre: 'Eritrocitos', unidad: 'x10⁶/µL', descripcion: 'Recuento de glóbulos rojos' },
  { nombre: 'VCM', unidad: 'fL', descripcion: 'Volumen corpuscular medio' },
  { nombre: 'HCM', unidad: 'pg', descripcion: 'Hemoglobina corpuscular media' },
  { nombre: 'CHCM', unidad: 'g/dL', descripcion: 'Concentración de hemoglobina corpuscular media' },
  
  // Otros
  { nombre: 'TSH', unidad: 'µUI/mL', descripcion: 'Hormona estimulante del tiroides' },
  { nombre: 'T4 Libre', unidad: 'ng/dL', descripcion: 'Tiroxina libre' },
  { nombre: 'T3 Libre', unidad: 'pg/mL', descripcion: 'Triyodotironina libre' },
  { nombre: 'PSA', unidad: 'ng/mL', descripcion: 'Antígeno prostático específico' },
  { nombre: 'Vitamina D', unidad: 'ng/mL', descripcion: '25-hidroxivitamina D' },
  { nombre: 'Vitamina B12', unidad: 'pg/mL', descripcion: 'Cobalamina' },
  { nombre: 'Acido Folico', unidad: 'ng/mL', descripcion: 'Ácido fólico en suero' }
]

// Categorías predefinidas con sus analitos
const CATEGORIAS_STANDARD = [
  {
    nombre: 'Química Completa 6',
    descripcion: 'Perfil bioquímico básico de 6 parámetros',
    analitos: [
      'Glucosa',
      'Colesterol Total',
      'Trigliceridos',
      'HDL Colesterol',
      'LDL Colesterol',
      'Hemoglobina Glicosilada'
    ]
  },
  {
    nombre: 'Química Básica 3',
    descripcion: 'Perfil bioquímico básico de 3 parámetros',
    analitos: [
      'Glucosa',
      'Colesterol Total',
      'Trigliceridos'
    ]
  },
  {
    nombre: 'Hematología Completa',
    descripcion: 'Hemograma completo con diferencial',
    analitos: [
      'Hemoglobina',
      'Hematocrito',
      'Leucocitos',
      'Neutrofilos',
      'Linfocitos',
      'Monocitos',
      'Eosinofilos',
      'Basofilos',
      'Plaquetas'
    ]
  },
  {
    nombre: 'Perfil Hepático',
    descripcion: 'Evaluación de función hepática',
    analitos: [
      'Bilirrubina Total',
      'Bilirrubina Directa',
      'Bilirrubina Indirecta',
      'AST (TGO)',
      'ALT (TGP)',
      'Fosfatasa Alcalina',
      'Albumina',
      'Proteínas Totales'
    ]
  },
  {
    nombre: 'Perfil Renal',
    descripcion: 'Evaluación de función renal',
    analitos: [
      'Creatinina',
      'Urea',
      'Acido Urico'
    ]
  },
  {
    nombre: 'Electrolitos',
    descripcion: 'Panel de electrolitos séricos',
    analitos: [
      'Sodio',
      'Potasio',
      'Cloro',
      'Calcio',
      'Fosforo',
      'Magnesio'
    ]
  },
  {
    nombre: 'Perfil Tiroideo',
    descripcion: 'Evaluación de función tiroidea',
    analitos: [
      'TSH',
      'T4 Libre',
      'T3 Libre'
    ]
  }
]

async function seedCatalogo() {
  try {
    console.log('🌱 Iniciando seed del catálogo clínico...\n')

    // 1. Crear analitos
    console.log('📋 Creando analitos...')
    const analitosCreados = new Map()
    
    for (const analitoData of ANALITOS_STANDARD) {
      try {
        const analito = await prisma.analito.upsert({
          where: { nombre: analitoData.nombre },
          update: {
            unidad: analitoData.unidad,
            descripcion: analitoData.descripcion,
            activo: true
          },
          create: {
            nombre: analitoData.nombre,
            unidad: analitoData.unidad,
            descripcion: analitoData.descripcion,
            activo: true
          }
        })
        analitosCreados.set(analitoData.nombre, analito)
        console.log(`   ✅ ${analito.nombre}`)
      } catch (error) {
        console.error(`   ❌ Error al crear ${analitoData.nombre}:`, error.message)
      }
    }

    console.log(`\n✅ ${analitosCreados.size} analitos procesados\n`)

    // 2. Crear categorías con sus analitos
    console.log('📦 Creando categorías de analitos...')
    
    for (const categoriaData of CATEGORIAS_STANDARD) {
      try {
        // Verificar que todos los analitos existen
        const analitosEncontrados = []
        const analitosNoEncontrados = []
        
        for (const nombreAnalito of categoriaData.analitos) {
          const analito = analitosCreados.get(nombreAnalito)
          if (analito) {
            analitosEncontrados.push({ analitoId: analito.id, nombre: nombreAnalito })
          } else {
            analitosNoEncontrados.push(nombreAnalito)
          }
        }

        if (analitosNoEncontrados.length > 0) {
          console.log(`   ⚠️  Categoría "${categoriaData.nombre}": Analitos no encontrados: ${analitosNoEncontrados.join(', ')}`)
          continue
        }

        // Crear o actualizar categoría
        const categoria = await prisma.categoriaAnalito.upsert({
          where: { nombre: categoriaData.nombre },
          update: {
            descripcion: categoriaData.descripcion
          },
          create: {
            nombre: categoriaData.nombre,
            descripcion: categoriaData.descripcion
          }
        })

        // Eliminar relaciones existentes
        await prisma.categoriaAnalitoDetalle.deleteMany({
          where: { categoriaId: categoria.id }
        })

        // Crear nuevas relaciones con orden
        await prisma.categoriaAnalitoDetalle.createMany({
          data: analitosEncontrados.map((item, index) => ({
            categoriaId: categoria.id,
            analitoId: item.analitoId,
            orden: index
          }))
        })

        console.log(`   ✅ ${categoria.nombre} (${analitosEncontrados.length} parámetros)`)
      } catch (error) {
        console.error(`   ❌ Error al crear categoría "${categoriaData.nombre}":`, error.message)
      }
    }

    console.log(`\n✅ ${CATEGORIAS_STANDARD.length} categorías procesadas\n`)

    // 3. Migrar tipos de prueba existentes al nuevo modelo
    console.log('🔄 Migrando tipos de prueba existentes...')
    
    const tiposPruebaExistentes = await prisma.tipoPrueba.findMany({
      where: { activo: true }
    })

    for (const tipoPrueba of tiposPruebaExistentes) {
      try {
        // Buscar categorías que coincidan con el nombre del tipo de prueba
        const categoriaMatch = await prisma.categoriaAnalito.findFirst({
          where: {
            nombre: {
              contains: tipoPrueba.nombre.split(' ')[0], // Buscar por primera palabra
              mode: 'insensitive'
            }
          },
          include: {
            analitos: {
              include: { analito: true },
              orderBy: { orden: 'asc' }
            }
          }
        })

        if (categoriaMatch) {
          // Verificar si los elementos del tipo de prueba coinciden con la categoría
          const elementosCategoria = categoriaMatch.analitos.map(d => d.analito.nombre)
          const elementosTipoPrueba = tipoPrueba.elementos.map(e => 
            e.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
          )

          const coinciden = elementosCategoria.length === elementosTipoPrueba.length &&
            elementosCategoria.every(elem => 
              elementosTipoPrueba.some(tp => 
                tp.toLowerCase().includes(elem.toLowerCase()) || 
                elem.toLowerCase().includes(tp.toLowerCase())
              )
            )

          if (coinciden) {
            // Asignar categoría al tipo de prueba
            await prisma.tipoPruebaCategoria.upsert({
              where: {
                tipoPruebaId_categoriaId: {
                  tipoPruebaId: tipoPrueba.id,
                  categoriaId: categoriaMatch.id
                }
              },
              update: {},
              create: {
                tipoPruebaId: tipoPrueba.id,
                categoriaId: categoriaMatch.id
              }
            })

            console.log(`   ✅ "${tipoPrueba.nombre}" → Categoría "${categoriaMatch.nombre}"`)
          } else {
            console.log(`   ⚠️  "${tipoPrueba.nombre}": No coincide exactamente con ninguna categoría`)
          }
        } else {
          // Intentar crear relaciones directas con analitos
          const analitosAsignados = []
          for (const elemento of tipoPrueba.elementos) {
            const nombreNormalizado = elemento
              .replace(/_/g, ' ')
              .replace(/\b\w/g, char => char.toUpperCase())
              .trim()

            // Buscar analito por nombre similar
            const analito = Array.from(analitosCreados.values()).find(a => 
              a.nombre.toLowerCase() === nombreNormalizado.toLowerCase() ||
              nombreNormalizado.toLowerCase().includes(a.nombre.toLowerCase()) ||
              a.nombre.toLowerCase().includes(nombreNormalizado.toLowerCase())
            )

            if (analito) {
              analitosAsignados.push(analito.id)
            }
          }

          if (analitosAsignados.length > 0) {
            // Eliminar relaciones existentes
            await prisma.tipoPruebaAnalito.deleteMany({
              where: { tipoPruebaId: tipoPrueba.id }
            })

            // Crear nuevas relaciones
            await prisma.tipoPruebaAnalito.createMany({
              data: analitosAsignados.map(analitoId => ({
                tipoPruebaId: tipoPrueba.id,
                analitoId
              }))
            })

            console.log(`   ✅ "${tipoPrueba.nombre}": ${analitosAsignados.length} analitos asignados directamente`)
          } else {
            console.log(`   ⚠️  "${tipoPrueba.nombre}": No se encontraron analitos coincidentes`)
          }
        }
      } catch (error) {
        console.error(`   ❌ Error al migrar "${tipoPrueba.nombre}":`, error.message)
      }
    }

    console.log('\n✅ Seed del catálogo completado exitosamente!')
    console.log('\n📊 Resumen:')
    console.log(`   • Analitos: ${analitosCreados.size}`)
    console.log(`   • Categorías: ${CATEGORIAS_STANDARD.length}`)
    console.log(`   • Tipos de prueba migrados: ${tiposPruebaExistentes.length}`)

  } catch (error) {
    console.error('❌ Error durante el seed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar seed
seedCatalogo()
  .then(() => {
    console.log('\n🎉 Proceso finalizado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error)
    process.exit(1)
  })

