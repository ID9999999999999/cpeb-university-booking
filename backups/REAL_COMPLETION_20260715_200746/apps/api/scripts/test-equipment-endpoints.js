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

async function main() {
  console.log('=== Equipment Endpoints Test ===');

  console.log('\nTEST 1 — List equipment');
  const listResult = await request('/equipment');

  console.log('HTTP:', listResult.status);
  console.log('Count:', Array.isArray(listResult.body) ? listResult.body.length : 'N/A');

  if (listResult.status !== 200 || !Array.isArray(listResult.body)) {
    console.log(listResult.body);
    throw new Error('Expected GET /equipment to return HTTP 200 and an array');
  }

  console.log('\nTEST 2 — Get one equipment by id');
  const firstEquipment = listResult.body[0];

  const oneResult = await request(`/equipment/${firstEquipment.id}`);

  console.log('HTTP:', oneResult.status);
  console.log('Name:', oneResult.body && oneResult.body.name);

  if (oneResult.status !== 200 || oneResult.body.id !== firstEquipment.id) {
    console.log(oneResult.body);
    throw new Error('Expected GET /equipment/:id to return one equipment');
  }

  console.log('\nTEST 3 — Create equipment');

  const uniqueTag = `TEST-${Date.now()}`;

  const createResult = await request('/equipment', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Equipment',
      category: 'Testing Device',
      inventoryTag: uniqueTag,
      location: 'Test Lab',
      description: 'Created by automated equipment endpoint test.',
    }),
  });

  console.log('HTTP:', createResult.status);
  console.log('Decision:', createResult.body && createResult.body.decision);
  console.log('Inventory tag:', createResult.body && createResult.body.equipment && createResult.body.equipment.inventoryTag);

  if (createResult.status !== 201) {
    console.log(createResult.body);
    throw new Error('Expected POST /equipment to return HTTP 201');
  }

  const createdEquipment = createResult.body.equipment;

  console.log('\nTEST 4 — Duplicate inventoryTag should fail');

  const duplicateResult = await request('/equipment', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Duplicate Test Equipment',
      category: 'Testing Device',
      inventoryTag: uniqueTag,
      location: 'Test Lab',
    }),
  });

  console.log('HTTP:', duplicateResult.status);
  console.log('Message:', duplicateResult.body && duplicateResult.body.message);

  if (duplicateResult.status !== 409) {
    console.log(duplicateResult.body);
    throw new Error('Expected duplicate POST /equipment to return HTTP 409');
  }

  console.log('\nTEST 5 — Update equipment status');

  const statusResult = await request(`/equipment/${createdEquipment.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'UNDER_MAINTENANCE',
    }),
  });

  console.log('HTTP:', statusResult.status);
  console.log('Decision:', statusResult.body && statusResult.body.decision);
  console.log('New status:', statusResult.body && statusResult.body.equipment && statusResult.body.equipment.status);

  if (
    statusResult.status !== 200 ||
    statusResult.body.equipment.status !== 'UNDER_MAINTENANCE'
  ) {
    console.log(statusResult.body);
    throw new Error('Expected PATCH /equipment/:id/status to update status');
  }

  console.log('\n✅ Equipment endpoint tests passed successfully.');
}

main().catch((error) => {
  console.error('\n❌ Equipment endpoint test failed.');
  console.error(error);
  process.exit(1);
});