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

function printResult(title, result) {
  console.log('\n====================================');
  console.log(title);
  console.log('HTTP Status:', result.status);
  console.log('Decision:', result.body.decision || 'N/A');
  console.log('Message:', result.body.message || 'N/A');
  console.log('Booking ID:', result.body.booking?.id || 'N/A');
}

async function main() {
  console.log('Cleaning previous booking test data...');

  await prisma.auditLog.deleteMany({
    where: {
      action: 'BOOKING_CREATED',
    },
  });

  await prisma.booking.deleteMany();

  const camera = await prisma.equipment.findUnique({
    where: { inventoryTag: 'CAM-001' },
  });

  const microscope = await prisma.equipment.findUnique({
    where: { inventoryTag: 'MIC-001' },
  });

  const student1 = await prisma.user.findUnique({
    where: { email: 'student1@university.test' },
  });

  const student2 = await prisma.user.findUnique({
    where: { email: 'student2@university.test' },
  });

  if (!camera || !microscope || !student1 || !student2) {
    throw new Error('Seed data is missing. Run node prisma\\seed.js first.');
  }

  console.log('Seed records found.');
  console.log('Camera:', camera.id);
  console.log('Microscope:', microscope.id);
  console.log('Student 1:', student1.id);
  console.log('Student 2:', student2.id);

  const validBooking = await postBooking({
    equipmentId: camera.id,
    userId: student1.id,
    startTime: '2026-07-12T10:00:00.000Z',
    endTime: '2026-07-12T12:00:00.000Z',
    reason: 'Media project recording session.',
  });

  printResult('TEST 1 — Valid booking should be accepted as PENDING', validBooking);

  const overlappingBooking = await postBooking({
    equipmentId: camera.id,
    userId: student2.id,
    startTime: '2026-07-12T11:00:00.000Z',
    endTime: '2026-07-12T13:00:00.000Z',
    reason: 'Overlapping booking attempt.',
  });

  printResult('TEST 2 — Overlapping booking should be rejected', overlappingBooking);

  const adjacentBooking = await postBooking({
    equipmentId: camera.id,
    userId: student2.id,
    startTime: '2026-07-12T12:00:00.000Z',
    endTime: '2026-07-12T14:00:00.000Z',
    reason: 'Adjacent non-overlapping booking.',
  });

  printResult('TEST 3 — Adjacent booking should be accepted', adjacentBooking);

  const invalidTimeBooking = await postBooking({
    equipmentId: camera.id,
    userId: student1.id,
    startTime: '2026-07-13T12:00:00.000Z',
    endTime: '2026-07-13T10:00:00.000Z',
    reason: 'Invalid time interval.',
  });

  printResult('TEST 4 — Invalid time should be rejected', invalidTimeBooking);

  const maintenanceBlockedBooking = await postBooking({
    equipmentId: microscope.id,
    userId: student1.id,
    startTime: '2026-07-09T10:00:00.000Z',
    endTime: '2026-07-09T12:00:00.000Z',
    reason: 'Trying to book equipment under maintenance.',
  });

  printResult('TEST 5 — Maintenance equipment should be rejected', maintenanceBlockedBooking);

  console.log('\n====================================');
  console.log('Expected result summary:');
  console.log('TEST 1: 201 accepted');
  console.log('TEST 2: 409 rejected because overlap');
  console.log('TEST 3: 201 accepted because adjacent time is allowed');
  console.log('TEST 4: 400 rejected because startTime >= endTime');
  console.log('TEST 5: 409 rejected because equipment is under maintenance');
  console.log('====================================');
}

main()
  .catch((error) => {
    console.error('Booking kernel test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });