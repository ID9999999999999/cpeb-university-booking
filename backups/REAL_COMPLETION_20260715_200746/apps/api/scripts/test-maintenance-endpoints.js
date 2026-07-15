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
  console.log('=== Maintenance Endpoints Test ===');

  const uniqueTag = `MAINT-TEST-${Date.now()}`;

  console.log('\nTEST 1 — Create test equipment');
  const createEquipment = await request('/equipment', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Maintenance Test Equipment',
      category: 'Test',
      inventoryTag: uniqueTag,
      location: 'Test Lab',
      description: 'Created by maintenance endpoint test script',
    }),
  });

  console.log('HTTP:', createEquipment.status);
  assert(createEquipment.status === 201, 'Expected equipment creation to return 201.');

  const equipmentId = createEquipment.body.equipment.id;
  console.log('Equipment ID:', equipmentId);

  const startTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  console.log('\nTEST 2 — List maintenance records');
  const listMaintenance = await request('/maintenance');

  console.log('HTTP:', listMaintenance.status);
  assert(listMaintenance.status === 200, 'Expected GET /maintenance to return 200.');
  assert(Array.isArray(listMaintenance.body), 'Expected maintenance list to be an array.');
  console.log('Count:', listMaintenance.body.length);

  console.log('\nTEST 3 — Create maintenance record');
  const createMaintenance = await request('/maintenance', {
    method: 'POST',
    body: JSON.stringify({
      equipmentId,
      title: 'Scheduled maintenance test',
      description: 'Testing maintenance creation',
      startTime,
      endTime,
      status: 'SCHEDULED',
    }),
  });

  console.log('HTTP:', createMaintenance.status);
  assert(createMaintenance.status === 201, 'Expected maintenance creation to return 201.');
  assert(
    createMaintenance.body.decision === 'MAINTENANCE_CREATED',
    'Expected decision MAINTENANCE_CREATED.',
  );

  const maintenanceId = createMaintenance.body.maintenance.id;
  console.log('Decision:', createMaintenance.body.decision);
  console.log('Maintenance ID:', maintenanceId);
  console.log('Status:', createMaintenance.body.maintenance.status);

  console.log('\nTEST 4 — Get one maintenance record by id');
  const getOne = await request(`/maintenance/${maintenanceId}`);

  console.log('HTTP:', getOne.status);
  assert(getOne.status === 200, 'Expected GET /maintenance/:id to return 200.');
  assert(getOne.body.id === maintenanceId, 'Expected returned maintenance id to match.');
  console.log('Title:', getOne.body.title);

  console.log('\nTEST 5 — Invalid maintenance time should fail');
  const invalidTime = await request('/maintenance', {
    method: 'POST',
    body: JSON.stringify({
      equipmentId,
      title: 'Invalid maintenance time',
      startTime: endTime,
      endTime: startTime,
      status: 'SCHEDULED',
    }),
  });

  console.log('HTTP:', invalidTime.status);
  console.log('Message:', invalidTime.body.message);
  assert(invalidTime.status === 400, 'Expected invalid time to return 400.');

  console.log('\nTEST 6 — Unknown equipment should fail');
  const unknownEquipment = await request('/maintenance', {
    method: 'POST',
    body: JSON.stringify({
      equipmentId: 'unknown-equipment-id',
      title: 'Unknown equipment maintenance',
      startTime,
      endTime,
      status: 'SCHEDULED',
    }),
  });

  console.log('HTTP:', unknownEquipment.status);
  console.log('Message:', unknownEquipment.body.message);
  assert(unknownEquipment.status === 404, 'Expected unknown equipment to return 404.');

  console.log('\nTEST 7 — Invalid maintenance status should fail');
  const invalidStatus = await request('/maintenance', {
    method: 'POST',
    body: JSON.stringify({
      equipmentId,
      title: 'Invalid maintenance status',
      startTime,
      endTime,
      status: 'BROKEN_STATUS',
    }),
  });

  console.log('HTTP:', invalidStatus.status);
  console.log('Message:', invalidStatus.body.message);
  assert(invalidStatus.status === 400, 'Expected invalid status to return 400.');

  console.log('\nTEST 8 — Update maintenance status');
  const updateStatus = await request(`/maintenance/${maintenanceId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'ACTIVE',
    }),
  });

  console.log('HTTP:', updateStatus.status);
  assert(updateStatus.status === 200, 'Expected status update to return 200.');
  assert(
    updateStatus.body.decision === 'MAINTENANCE_STATUS_UPDATED',
    'Expected decision MAINTENANCE_STATUS_UPDATED.',
  );
  assert(updateStatus.body.maintenance.status === 'ACTIVE', 'Expected status ACTIVE.');

  console.log('Decision:', updateStatus.body.decision);
  console.log('New status:', updateStatus.body.maintenance.status);

  console.log('\n✅ Maintenance endpoint tests passed successfully.');
}

main().catch((error) => {
  console.error('\n❌ Maintenance endpoint tests failed.');
  console.error(error.message);
  process.exit(1);
});