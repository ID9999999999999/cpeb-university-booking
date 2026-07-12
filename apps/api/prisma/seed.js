require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@university.test' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@university.test',
      password: 'password123',
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@university.test' },
    update: {},
    create: {
      fullName: 'Lab Manager',
      email: 'manager@university.test',
      password: 'password123',
      role: 'LAB_MANAGER',
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: 'technician@university.test' },
    update: {},
    create: {
      fullName: 'Technical Operator',
      email: 'technician@university.test',
      password: 'password123',
      role: 'TECHNICIAN',
    },
  });

  const student1 = await prisma.user.upsert({
    where: { email: 'student1@university.test' },
    update: {},
    create: {
      fullName: 'Student One',
      email: 'student1@university.test',
      password: 'password123',
      role: 'STUDENT',
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@university.test' },
    update: {},
    create: {
      fullName: 'Student Two',
      email: 'student2@university.test',
      password: 'password123',
      role: 'STUDENT',
    },
  });

  const camera = await prisma.equipment.upsert({
    where: { inventoryTag: 'CAM-001' },
    update: {},
    create: {
      name: 'Camera 01',
      category: 'Camera',
      inventoryTag: 'CAM-001',
      location: 'Media Lab',
      status: 'AVAILABLE',
      description: 'Canon camera for media and university projects.',
    },
  });

  const laptop = await prisma.equipment.upsert({
    where: { inventoryTag: 'LAP-001' },
    update: {},
    create: {
      name: 'Laptop 01',
      category: 'Laptop',
      inventoryTag: 'LAP-001',
      location: 'Computer Lab',
      status: 'AVAILABLE',
      description: 'Laptop for student academic work.',
    },
  });

  const projector = await prisma.equipment.upsert({
    where: { inventoryTag: 'PROJ-001' },
    update: {},
    create: {
      name: 'Projector 01',
      category: 'Projector',
      inventoryTag: 'PROJ-001',
      location: 'Room A101',
      status: 'AVAILABLE',
      description: 'Classroom projector.',
    },
  });

  const microscope = await prisma.equipment.upsert({
    where: { inventoryTag: 'MIC-001' },
    update: {},
    create: {
      name: 'Microscope 01',
      category: 'Lab Device',
      inventoryTag: 'MIC-001',
      location: 'Biology Lab',
      status: 'UNDER_MAINTENANCE',
      description: 'Microscope currently under maintenance.',
    },
  });

  await prisma.maintenanceRecord.create({
    data: {
      equipmentId: microscope.id,
      title: 'Initial microscope calibration',
      description: 'Calibration and technical inspection before use.',
      startTime: new Date('2026-07-08T09:00:00.000Z'),
      endTime: new Date('2026-07-10T09:00:00.000Z'),
      status: 'ACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SEED_DATABASE',
      entityType: 'SYSTEM',
      entityId: 'initial-seed',
      metadata: {
        users: [
          admin.email,
          manager.email,
          technician.email,
          student1.email,
          student2.email,
        ],
        equipment: [
          camera.inventoryTag,
          laptop.inventoryTag,
          projector.inventoryTag,
          microscope.inventoryTag,
        ],
      },
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });