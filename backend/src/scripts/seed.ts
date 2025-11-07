import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear roles y usuarios iniciales
  const hashedPassword = await bcrypt.hash('admin123', 12);

  // Crear usuario super admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@laboratorio.com' },
    update: {},
    create: {
      email: 'admin@laboratorio.com',
      password: hashedPassword,
      nombre: 'Super',
      apellido: 'Admin',
      role: 'SUPER_ADMIN',
      telefono: '+52 (XXX) XXX-XXXX'
    }
  });

  console.log('✅ Usuario super admin creado:', superAdmin.email);

  // Crear sucursal principal
  const sucursalPrincipal = await prisma.sucursal.upsert({
    where: { id: 'sucursal-principal' },
    update: {},
    create: {
      id: 'sucursal-principal',
      nombre: 'Sucursal Principal',
      direccion: 'Av. Principal 123, Centro, Ciudad',
      telefono: '+52 (XXX) XXX-XXXX',
      email: 'principal@laboratorio.com'
    }
  });

  console.log('✅ Sucursal principal creada:', sucursalPrincipal.nombre);

  // Asignar super admin a sucursal principal
  await prisma.sucursalUser.upsert({
    where: {
      sucursalId_userId: {
        sucursalId: sucursalPrincipal.id,
        userId: superAdmin.id
      }
    },
    update: {},
    create: {
      sucursalId: sucursalPrincipal.id,
      userId: superAdmin.id
    }
  });

  // Crear responsable sanitario
  const responsableSanitario = await prisma.user.upsert({
    where: { email: 'responsable@laboratorio.com' },
    update: {},
    create: {
      email: 'responsable@laboratorio.com',
      password: hashedPassword,
      nombre: 'Dr. Juan',
      apellido: 'Pérez',
      role: 'RESPONSABLE_SANITARIO',
      telefono: '+52 (XXX) XXX-XXXX'
    }
  });

  // Asignar responsable a sucursal
  await prisma.sucursalUser.upsert({
    where: {
      sucursalId_userId: {
        sucursalId: sucursalPrincipal.id,
        userId: responsableSanitario.id
      }
    },
    update: {},
    create: {
      sucursalId: sucursalPrincipal.id,
      userId: responsableSanitario.id
    }
  });

  console.log('✅ Responsable sanitario creado:', responsableSanitario.email);

  // Crear técnico de laboratorio
  const tecnico = await prisma.user.upsert({
    where: { email: 'tecnico@laboratorio.com' },
    update: {},
    create: {
      email: 'tecnico@laboratorio.com',
      password: hashedPassword,
      nombre: 'María',
      apellido: 'González',
      role: 'TECNICO_LABORATORIO',
      telefono: '+52 (XXX) XXX-XXXX'
    }
  });

  // Asignar técnico a sucursal
  await prisma.sucursalUser.upsert({
    where: {
      sucursalId_userId: {
        sucursalId: sucursalPrincipal.id,
        userId: tecnico.id
      }
    },
    update: {},
    create: {
      sucursalId: sucursalPrincipal.id,
      userId: tecnico.id
    }
  });

  console.log('✅ Técnico de laboratorio creado:', tecnico.email);

  // Crear recepcionista
  const recepcionista = await prisma.user.upsert({
    where: { email: 'recepcion@laboratorio.com' },
    update: {},
    create: {
      email: 'recepcion@laboratorio.com',
      password: hashedPassword,
      nombre: 'Ana',
      apellido: 'López',
      role: 'RECEPCION',
      telefono: '+52 (XXX) XXX-XXXX'
    }
  });

  // Asignar recepcionista a sucursal
  await prisma.sucursalUser.upsert({
    where: {
      sucursalId_userId: {
        sucursalId: sucursalPrincipal.id,
        userId: recepcionista.id
      }
    },
    update: {},
    create: {
      sucursalId: sucursalPrincipal.id,
      userId: recepcionista.id
    }
  });

  console.log('✅ Recepcionista creada:', recepcionista.email);

  // Crear maquinaria de ejemplo
  const maquinaria1 = await prisma.maquinaria.upsert({
    where: { numeroSerie: 'AUTO-001' },
    update: {},
    create: {
      nombre: 'Analizador Automático',
      modelo: 'AutoAnalyzer 2000',
      marca: 'LabTech',
      numeroSerie: 'AUTO-001',
      sucursalId: sucursalPrincipal.id,
      tipoPruebas: ['QUIMICA_COMPLETA_6', 'QUIMICA_BASICA_3'],
      ultimoMantenimiento: new Date('2024-01-01'),
      proximoMantenimiento: new Date('2024-07-01')
    }
  });

  const maquinaria2 = await prisma.maquinaria.upsert({
    where: { numeroSerie: 'HEMA-001' },
    update: {},
    create: {
      nombre: 'Contador Hematológico',
      modelo: 'HemaCount 500',
      marca: 'BloodTech',
      numeroSerie: 'HEMA-001',
      sucursalId: sucursalPrincipal.id,
      tipoPruebas: ['HEMATOLOGIA_COMPLETA'],
      ultimoMantenimiento: new Date('2024-01-15'),
      proximoMantenimiento: new Date('2024-07-15')
    }
  });

  console.log('✅ Maquinaria creada:', maquinaria1.nombre, 'y', maquinaria2.nombre);

  // Crear salas de chat
  const salaGeneral = await prisma.chatRoom.upsert({
    where: { id: 'sala-general' },
    update: {},
    create: {
      id: 'sala-general',
      nombre: 'General',
      tipo: 'GENERAL'
    }
  });

  const salaSucursal = await prisma.chatRoom.upsert({
    where: { id: 'sala-sucursal-principal' },
    update: {},
    create: {
      id: 'sala-sucursal-principal',
      nombre: 'Sucursal Principal',
      tipo: 'SUCURSAL',
      sucursalId: sucursalPrincipal.id
    }
  });

  console.log('✅ Salas de chat creadas:', salaGeneral.nombre, 'y', salaSucursal.nombre);

  // Crear cliente de ejemplo
  const clienteEjemplo = await prisma.cliente.upsert({
    where: { email: 'cliente@ejemplo.com' },
    update: {},
    create: {
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      email: 'cliente@ejemplo.com',
      telefono: '+52 (XXX) XXX-XXXX',
      fechaNacimiento: new Date('1990-05-15'),
      genero: 'M',
      direccion: 'Calle Ejemplo 456, Colonia Centro'
    }
  });

  console.log('✅ Cliente de ejemplo creado:', clienteEjemplo.email);

  // Crear comanda de ejemplo
  const comandaEjemplo = await prisma.comanda.upsert({
    where: { numeroComanda: 'CMD-2024-001' },
    update: {},
    create: {
      numeroComanda: 'CMD-2024-001',
      clienteId: clienteEjemplo.id,
      sucursalId: sucursalPrincipal.id,
      tipoPrueba: 'QUIMICA_COMPLETA_6',
      elementos: ['Glucosa', 'Colesterol Total', 'HDL', 'LDL', 'Triglicéridos', 'Creatinina'],
      estado: 'PENDIENTE',
      responsableId: recepcionista.id,
      observaciones: 'Paciente en ayunas de 12 horas'
    }
  });

  console.log('✅ Comanda de ejemplo creada:', comandaEjemplo.numeroComanda);

  console.log('🎉 Seed completado exitosamente!');
  console.log('\n📋 Credenciales de acceso:');
  console.log('Super Admin: admin@laboratorio.com / admin123');
  console.log('Responsable: responsable@laboratorio.com / admin123');
  console.log('Técnico: tecnico@laboratorio.com / admin123');
  console.log('Recepción: recepcion@laboratorio.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
