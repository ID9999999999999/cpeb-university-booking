require('dotenv').config();

const { Client } = require('pg');

const API_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const body = await response.json().catch(() => null);

  return {
    status: response.status,
    ok: response.ok,
    body,
  };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function main() {
  console.log('=== Approval Flow Test ===');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing from .env');
  }

  const db = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await db.connect();

  const managerResult = await db.query(
    `SELECT id, email FROM "User" WHERE email = $1 LIMIT 1`,
    ['manager@university.test'],
  );

  const studentResult = await db.query(
    `SELECT id, email FROM "User" WHERE email = $1 LIMIT 1`,
    ['student1@university.test'],
  );

  const equipmentResult = await db.query(
    `SELECT id, name, status FROM "Equipment" WHERE status = $1 ORDER BY name ASC LIMIT 1`,
    ['AVAILABLE'],
  );

  if (managerResult.rows.length === 0) {
    throw new Error('manager@university.test not found');
  }

  if (studentResult.rows.length === 0) {
    throw new Error('student1@university.test not found');
  }

  if (equipmentResult.rows.length === 0) {
    throw new Error('No AVAILABLE equipment found');
  }

  const manager = managerResult.rows[0];
  const student = studentResult.rows[0];
  const equipment = equipmentResult.rows[0];

  console.log('Manager:', manager.email);
  console.log('Student:', student.email);
  console.log('Equipment:', equipment.name);

  const base = new Date('2035-01-01T10:00:00.000Z');

  const approveStart = addDays(base, Math.floor(Math.random() * 1000));
  const approveEnd = new Date(approveStart.getTime() + 60 * 60 * 1000);

  const rejectStart = new Date(approveEnd.getTime() + 60 * 60 * 1000);
  const rejectEnd = new Date(rejectStart.getTime() + 60 * 60 * 1000);

  console.log('\nTEST 1 — Create booking for approval');

  const createForApproval = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      equipmentId: equipment.id,
      userId: student.id,
      startTime: approveStart.toISOString(),
      endTime: approveEnd.toISOString(),
      reason: 'Approval flow test booking',
    }),
  });

  console.log('HTTP:', createForApproval.status);
  console.log('Decision:', createForApproval.body && createForApproval.body.decision);

  if (createForApproval.status !== 201) {
    console.log(createForApproval.body);
    throw new Error('Expected booking creation to return HTTP 201');
  }

  const bookingToApprove = createForApproval.body.booking;

  console.log('\nTEST 2 — Approve pending booking');

  const approveResult = await request(`/bookings/${bookingToApprove.id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({
      actorId: manager.id,
    }),
  });

  console.log('HTTP:', approveResult.status);
  console.log('Decision:', approveResult.body && approveResult.body.decision);
  console.log('New status:', approveResult.body && approveResult.body.booking && approveResult.body.booking.status);

  if (approveResult.status !== 200) {
    console.log(approveResult.body);
    throw new Error('Expected approval to return HTTP 200');
  }

  console.log('\nTEST 3 — Approve same booking again should fail');

  const approveAgainResult = await request(`/bookings/${bookingToApprove.id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({
      actorId: manager.id,
    }),
  });

  console.log('HTTP:', approveAgainResult.status);
  console.log('Message:', approveAgainResult.body && approveAgainResult.body.message);

  if (approveAgainResult.status !== 409) {
    console.log(approveAgainResult.body);
    throw new Error('Expected second approval to return HTTP 409');
  }

  console.log('\nTEST 4 — Create booking for rejection');

  const createForRejection = await request('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      equipmentId: equipment.id,
      userId: student.id,
      startTime: rejectStart.toISOString(),
      endTime: rejectEnd.toISOString(),
      reason: 'Rejection flow test booking',
    }),
  });

  console.log('HTTP:', createForRejection.status);
  console.log('Decision:', createForRejection.body && createForRejection.body.decision);

  if (createForRejection.status !== 201) {
    console.log(createForRejection.body);
    throw new Error('Expected booking creation to return HTTP 201');
  }

  const bookingToReject = createForRejection.body.booking;

  console.log('\nTEST 5 — Reject pending booking');

  const rejectResult = await request(`/bookings/${bookingToReject.id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({
      actorId: manager.id,
      reason: 'Not approved for this test',
    }),
  });

  console.log('HTTP:', rejectResult.status);
  console.log('Decision:', rejectResult.body && rejectResult.body.decision);
  console.log('New status:', rejectResult.body && rejectResult.body.booking && rejectResult.body.booking.status);

  if (rejectResult.status !== 200) {
    console.log(rejectResult.body);
    throw new Error('Expected rejection to return HTTP 200');
  }

  console.log('\nTEST 6 — Reject same booking again should fail');

  const rejectAgainResult = await request(`/bookings/${bookingToReject.id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({
      actorId: manager.id,
      reason: 'Second rejection attempt',
    }),
  });

  console.log('HTTP:', rejectAgainResult.status);
  console.log('Message:', rejectAgainResult.body && rejectAgainResult.body.message);

  if (rejectAgainResult.status !== 409) {
    console.log(rejectAgainResult.body);
    throw new Error('Expected second rejection to return HTTP 409');
  }

  console.log('\nTEST 7 — Check audit logs');

  const auditResult = await db.query(
    `
      SELECT action, "entityType", "actorId", "equipmentId"
      FROM "AuditLog"
      WHERE action IN ('BOOKING_APPROVED', 'BOOKING_REJECTED')
      ORDER BY "createdAt" DESC
      LIMIT 10
    `,
  );

  console.table(auditResult.rows);

  const hasApprovedAudit = auditResult.rows.some(
    (row) => row.action === 'BOOKING_APPROVED',
  );

  const hasRejectedAudit = auditResult.rows.some(
    (row) => row.action === 'BOOKING_REJECTED',
  );

  if (!hasApprovedAudit || !hasRejectedAudit) {
    throw new Error('Expected BOOKING_APPROVED and BOOKING_REJECTED audit logs');
  }

  await db.end();

  console.log('\n✅ Approval Flow tests passed successfully.');
}

main().catch((error) => {
  console.error('\n❌ Approval Flow test failed.');
  console.error(error);
  process.exit(1);
});