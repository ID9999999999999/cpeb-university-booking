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
  console.log('=== Repair Tickets Endpoints Test ===');

  const uniqueTag = `REPAIR-TEST-${Date.now()}`;

  console.log('\nTEST 1 — Create test equipment');
  const createEquipment = await request('/equipment', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Repair Ticket Test Equipment',
      category: 'Test',
      inventoryTag: uniqueTag,
      location: 'Repair Lab',
      description: 'Created by repair ticket endpoint test script',
    }),
  });

  console.log('HTTP:', createEquipment.status);
  assert(createEquipment.status === 201, 'Expected equipment creation to return 201.');

  const equipmentId = createEquipment.body.equipment.id;
  console.log('Equipment ID:', equipmentId);

  console.log('\nTEST 2 — List repair tickets');
  const listTickets = await request('/repair-tickets');

  console.log('HTTP:', listTickets.status);
  assert(listTickets.status === 200, 'Expected GET /repair-tickets to return 200.');
  assert(Array.isArray(listTickets.body), 'Expected repair tickets list to be an array.');
  console.log('Count:', listTickets.body.length);

  console.log('\nTEST 3 — Create repair ticket');
  const createTicket = await request('/repair-tickets', {
    method: 'POST',
    body: JSON.stringify({
      equipmentId,
      title: 'Lens problem test',
      description: 'Testing repair ticket creation',
    }),
  });

  console.log('HTTP:', createTicket.status);
  assert(createTicket.status === 201, 'Expected repair ticket creation to return 201.');
  assert(
    createTicket.body.decision === 'REPAIR_TICKET_CREATED',
    'Expected decision REPAIR_TICKET_CREATED.',
  );

  const repairTicketId = createTicket.body.repairTicket.id;
  console.log('Decision:', createTicket.body.decision);
  console.log('Repair Ticket ID:', repairTicketId);
  console.log('Status:', createTicket.body.repairTicket.status);

  console.log('\nTEST 4 — Get one repair ticket by id');
  const getOne = await request(`/repair-tickets/${repairTicketId}`);

  console.log('HTTP:', getOne.status);
  assert(getOne.status === 200, 'Expected GET /repair-tickets/:id to return 200.');
  assert(getOne.body.id === repairTicketId, 'Expected returned repair ticket id to match.');
  console.log('Title:', getOne.body.title);

  console.log('\nTEST 5 — Unknown equipment should fail');
  const unknownEquipment = await request('/repair-tickets', {
    method: 'POST',
    body: JSON.stringify({
      equipmentId: 'unknown-equipment-id',
      title: 'Unknown equipment repair ticket',
    }),
  });

  console.log('HTTP:', unknownEquipment.status);
  console.log('Message:', unknownEquipment.body.message);
  assert(unknownEquipment.status === 404, 'Expected unknown equipment to return 404.');

  console.log('\nTEST 6 — Missing title should fail');
  const missingTitle = await request('/repair-tickets', {
    method: 'POST',
    body: JSON.stringify({
      equipmentId,
    }),
  });

  console.log('HTTP:', missingTitle.status);
  console.log('Message:', missingTitle.body.message);
  assert(missingTitle.status === 400, 'Expected missing title to return 400.');

  console.log('\nTEST 7 — Invalid status should fail');
  const invalidStatus = await request(`/repair-tickets/${repairTicketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'BROKEN_STATUS',
    }),
  });

  console.log('HTTP:', invalidStatus.status);
  console.log('Message:', invalidStatus.body.message);
  assert(invalidStatus.status === 400, 'Expected invalid status to return 400.');

  console.log('\nTEST 8 — Update repair ticket status');
  const updateStatus = await request(`/repair-tickets/${repairTicketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'DIAGNOSING',
      diagnosis: 'Lens alignment issue detected.',
      evidenceUrl: 'local-test-evidence.txt',
    }),
  });

  console.log('HTTP:', updateStatus.status);
  assert(updateStatus.status === 200, 'Expected status update to return 200.');
  assert(
    updateStatus.body.decision === 'REPAIR_TICKET_STATUS_UPDATED',
    'Expected decision REPAIR_TICKET_STATUS_UPDATED.',
  );
  assert(updateStatus.body.repairTicket.status === 'DIAGNOSING', 'Expected status DIAGNOSING.');

  console.log('Decision:', updateStatus.body.decision);
  console.log('New status:', updateStatus.body.repairTicket.status);
  console.log('Diagnosis:', updateStatus.body.repairTicket.diagnosis);

  console.log('\n✅ Repair ticket endpoint tests passed successfully.');
}

main().catch((error) => {
  console.error('\n❌ Repair ticket endpoint tests failed.');
  console.error(error.message);
  process.exit(1);
});