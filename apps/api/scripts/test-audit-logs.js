const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

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

async function main() {
  console.log('=== Audit Logs Endpoints Test ===');

  console.log('\nTEST 1 — List audit logs');
  const listLogs = await request('/audit-logs');

  console.log('HTTP:', listLogs.status);
  assert(listLogs.status === 200, 'Expected GET /audit-logs to return 200.');
  assert(Array.isArray(listLogs.body), 'Expected audit logs list to be an array.');
  console.log('Count:', listLogs.body.length);

  if (listLogs.body.length === 0) {
    throw new Error('No audit logs found. Run previous endpoint tests first.');
  }

  const firstAuditLog = listLogs.body[0];
  const auditLogId = firstAuditLog.id;

  console.log('First AuditLog ID:', auditLogId);
  console.log('Action:', firstAuditLog.action);
  console.log('Entity Type:', firstAuditLog.entityType);

  console.log('\nTEST 2 — Get one audit log by id');
  const getOne = await request(`/audit-logs/${auditLogId}`);

  console.log('HTTP:', getOne.status);
  assert(getOne.status === 200, 'Expected GET /audit-logs/:id to return 200.');
  assert(getOne.body.id === auditLogId, 'Expected returned audit log id to match.');
  console.log('Action:', getOne.body.action);

  console.log('\nTEST 3 — Unknown audit log should fail');
  const unknownLog = await request('/audit-logs/unknown-audit-log-id');

  console.log('HTTP:', unknownLog.status);
  console.log('Message:', unknownLog.body.message);
  assert(unknownLog.status === 404, 'Expected unknown audit log to return 404.');

  const equipmentLog = listLogs.body.find((log) => log.equipmentId);

  if (equipmentLog) {
    console.log('\nTEST 4 — List audit logs by equipment id');
    const byEquipment = await request(`/audit-logs/equipment/${equipmentLog.equipmentId}`);

    console.log('HTTP:', byEquipment.status);
    assert(
      byEquipment.status === 200,
      'Expected GET /audit-logs/equipment/:equipmentId to return 200.',
    );
    assert(Array.isArray(byEquipment.body), 'Expected equipment audit logs to be an array.');
    console.log('Equipment Audit Count:', byEquipment.body.length);
  } else {
    console.log('\nTEST 4 — Skipped: no equipment audit log found.');
  }

  const bookingLog = listLogs.body.find((log) => log.bookingId);

  if (bookingLog) {
    console.log('\nTEST 5 — List audit logs by booking id');
    const byBooking = await request(`/audit-logs/booking/${bookingLog.bookingId}`);

    console.log('HTTP:', byBooking.status);
    assert(
      byBooking.status === 200,
      'Expected GET /audit-logs/booking/:bookingId to return 200.',
    );
    assert(Array.isArray(byBooking.body), 'Expected booking audit logs to be an array.');
    console.log('Booking Audit Count:', byBooking.body.length);
  } else {
    console.log('\nTEST 5 — Skipped: no booking audit log found.');
  }

  console.log('\n✅ Audit log endpoint tests passed successfully.');
}

main().catch((error) => {
  console.error('\n❌ Audit log endpoint tests failed.');
  console.error(error.message);
  process.exit(1);
});