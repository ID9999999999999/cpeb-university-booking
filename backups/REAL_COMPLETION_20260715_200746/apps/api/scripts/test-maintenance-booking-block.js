require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function postBooking(payload) {
  const response = await fetch('http://localhost:3000/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();

  return {
    status: response.status,
    body,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function printResult(title, result) {
  console.log('\n====================================');
  console.log(title);
  console.log('HTTP Status:', result.status);
  console.log('Decision:', result.body.decision || 'N/A');
  console.log('Message:', result.body.message || 'N/A');
  console.log('Booking ID:', result.body.booking?.id || 'N/A');
}

async function main() {
  console.log('=== Maintenance Booking Block Test ===');

  const student1 = await prisma.user.findUnique({
    where: { email: 'student1@university.test' },
  });

  const student2 = await prisma.user.findUnique({
    where: { email: 'student2@university.test' },
  });

  if (!student1 || !student2) {
    throw new Error('Seed users are missing. Run node prisma\\seed.js first.');
  }

  const uniqueTag = `MBLOCK-${Date.now()}`;

  const equipment = await prisma.equipment.create({
    data: {
      name: 'Maintenance Blocking Test Equipment',
      category: 'Test',
      inventoryTag: uniqueTag,
      location: 'Test Lab',
      description: 'Created by maintenance booking block test.',
    },
  });

  console.log('Test equipment created:', equipment.id);

  const maintenance = await prisma.maintenanceRecord.create({
    data: {
      equipmentId: equipment.id,
      title: 'Scheduled blocking maintenance',
      description: 'This maintenance window should block overlapping bookings.',
      startTime: new Date('2026-08-01T10:00:00.000Z'),
      endTime: new Date('2026-08-01T12:00:00.000Z'),
      status: 'SCHEDULED',
    },
  });

  console.log('Scheduled maintenance created:', maintenance.id);

  const overlappingBooking = await postBooking({
    equipmentId: equipment.id,
    userId: student1.id,
    startTime: '2026-08-01T11:00:00.000Z',
    endTime: '2026-08-01T13:00:00.000Z',
    reason: 'This booking overlaps scheduled maintenance.',
  });

  printResult(
    'TEST 1 — Overlapping booking should be rejected by SCHEDULED maintenance',
    overlappingBooking,
  );

  assert(
    overlappingBooking.status === 409,
    'Expected overlapping maintenance booking to return 409.',
  );
  assert(
    overlappingBooking.body.message === 'Equipment is blocked by overlapping maintenance.',
    'Expected maintenance blocking message.',
  );

  const adjacentBooking = await postBooking({
    equipmentId: equipment.id,
    userId: student2.id,
    startTime: '2026-08-01T12:00:00.000Z',
    endTime: '2026-08-01T13:00:00.000Z',
    reason: 'This booking starts exactly when maintenance ends.',
  });

  printResult(
    'TEST 2 — Adjacent booking after maintenance should be accepted',
    adjacentBooking,
  );

  assert(
    adjacentBooking.status === 201,
    'Expected adjacent booking after maintenance to return 201.',
  );

  const activeTag = `MACTIVE-${Date.now()}`;

  const activeEquipment = await prisma.equipment.create({
    data: {
      name: 'Active Maintenance Blocking Test Equipment',
      category: 'Test',
      inventoryTag: activeTag,
      location: 'Test Lab',
      description: 'Created by active maintenance booking block test.',
    },
  });

  const activeMaintenance = await prisma.maintenanceRecord.create({
    data: {
      equipmentId: activeEquipment.id,
      title: 'Active blocking maintenance',
      description: 'ACTIVE maintenance should also block overlapping bookings.',
      startTime: new Date('2026-08-02T10:00:00.000Z'),
      endTime: new Date('2026-08-02T12:00:00.000Z'),
      status: 'ACTIVE',
    },
  });

  console.log('Active maintenance created:', activeMaintenance.id);

  const activeBlockedBooking = await postBooking({
    equipmentId: activeEquipment.id,
    userId: student1.id,
    startTime: '2026-08-02T11:00:00.000Z',
    endTime: '2026-08-02T13:00:00.000Z',
    reason: 'This booking overlaps active maintenance.',
  });

  printResult(
    'TEST 3 — Overlapping booking should be rejected by ACTIVE maintenance',
    activeBlockedBooking,
  );

  assert(
    activeBlockedBooking.status === 409,
    'Expected active maintenance overlap to return 409.',
  );

  const completedTag = `MCOMPLETE-${Date.now()}`;

  const completedEquipment = await prisma.equipment.create({
    data: {
      name: 'Completed Maintenance Test Equipment',
      category: 'Test',
      inventoryTag: completedTag,
      location: 'Test Lab',
      description: 'Created by completed maintenance booking test.',
    },
  });

  const completedMaintenance = await prisma.maintenanceRecord.create({
    data: {
      equipmentId: completedEquipment.id,
      title: 'Completed maintenance',
      description: 'COMPLETED maintenance should not block new bookings.',
      startTime: new Date('2026-08-03T10:00:00.000Z'),
      endTime: new Date('2026-08-03T12:00:00.000Z'),
      status: 'COMPLETED',
    },
  });

  console.log('Completed maintenance created:', completedMaintenance.id);

  const completedOverlapBooking = await postBooking({
    equipmentId: completedEquipment.id,
    userId: student1.id,
    startTime: '2026-08-03T11:00:00.000Z',
    endTime: '2026-08-03T13:00:00.000Z',
    reason: 'This overlaps completed maintenance and should be accepted.',
  });

  printResult(
    'TEST 4 — COMPLETED maintenance should not block booking',
    completedOverlapBooking,
  );

  assert(
    completedOverlapBooking.status === 201,
    'Expected booking over completed maintenance to return 201.',
  );

  console.log('\n✅ Maintenance booking block tests passed successfully.');
}

main()
  .catch((error) => {
    console.error('\n❌ Maintenance booking block tests failed.');
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });