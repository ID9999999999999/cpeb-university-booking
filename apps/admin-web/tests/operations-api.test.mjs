import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, CpebAdminApi } from '../api.js';

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

async function authenticatedApi(requests, role = 'ADMIN') {
  let step = 0;
  const api = new CpebAdminApi('https://api.example.test', async (url, options) => {
    step += 1;
    if (step === 1) return jsonResponse(200, { accessToken: 'ops-token', user: { role } });
    if (step === 2) return jsonResponse(200, { id: 'u1', role });
    requests.push({ url, options });
    return jsonResponse(200, []);
  });
  await api.login('ops@example.test', 'password');
  return api;
}

test('reports support filtered and unfiltered retrieval', async () => {
  const requests = [];
  const api = await authenticatedApi(requests);
  await api.reports(' waiting_parts ');
  await api.reports();
  assert.equal(requests[0].url, 'https://api.example.test/admin/reports?status=WAITING_PARTS');
  assert.equal(requests[1].url, 'https://api.example.test/admin/reports');
});

test('report status update encodes id and bounds diagnosis', async () => {
  const requests = [];
  const api = await authenticatedApi(requests);
  await api.updateReportStatus('report/id 1', ' resolved ', `  ${'x'.repeat(5000)}  `);
  assert.equal(requests[0].url, 'https://api.example.test/admin/reports/report%2Fid%201/status');
  assert.equal(requests[0].options.method, 'PATCH');
  const body = JSON.parse(requests[0].options.body);
  assert.equal(body.status, 'RESOLVED');
  assert.equal(body.diagnosis.length, 4000);
});

test('maintenance retrieval and status updates use normalized values', async () => {
  const requests = [];
  const api = await authenticatedApi(requests, 'LAB_MANAGER');
  await api.maintenance(' active ');
  await api.updateMaintenanceStatus('maint id', ' completed ');
  assert.equal(requests[0].url, 'https://api.example.test/admin/maintenance?status=ACTIVE');
  assert.equal(requests[1].url, 'https://api.example.test/admin/maintenance/maint%20id/status');
  assert.deepEqual(JSON.parse(requests[1].options.body), { status: 'COMPLETED' });
});

test('maintenance scheduler normalizes bounded fields and preserves ISO times', async () => {
  const requests = [];
  const api = await authenticatedApi(requests, 'LAB_MANAGER');
  await api.createMaintenance({
    equipmentId: ' equipment-1 ',
    title: `  ${'T'.repeat(250)}  `,
    description: `  ${'D'.repeat(4500)}  `,
    startTime: '2026-09-15T08:00:00.000Z',
    endTime: '2026-09-15T09:30:00.000Z',
  });

  assert.equal(requests[0].url, 'https://api.example.test/admin/maintenance');
  assert.equal(requests[0].options.method, 'POST');
  const body = JSON.parse(requests[0].options.body);
  assert.equal(body.equipmentId, 'equipment-1');
  assert.equal(body.title.length, 200);
  assert.equal(body.description.length, 4000);
  assert.equal(body.startTime, '2026-09-15T08:00:00.000Z');
  assert.equal(body.endTime, '2026-09-15T09:30:00.000Z');
});

test('maintenance scheduler rejects incomplete requests before network calls', async () => {
  const requests = [];
  const api = await authenticatedApi(requests);
  assert.throws(() => api.createMaintenance({
    equipmentId: '',
    title: 'Inspection',
    startTime: '2026-09-15T08:00:00.000Z',
    endTime: '2026-09-15T09:00:00.000Z',
  }), /Equipment is required/);
  assert.throws(() => api.createMaintenance({
    equipmentId: 'e1',
    title: '   ',
    startTime: '2026-09-15T08:00:00.000Z',
    endTime: '2026-09-15T09:00:00.000Z',
  }), /title is required/);
  assert.equal(requests.length, 0);
});

test('operations mutations reject empty statuses before network calls', async () => {
  const requests = [];
  const api = await authenticatedApi(requests);
  assert.throws(() => api.updateReportStatus('r1', '   '), ApiError);
  assert.throws(() => api.updateMaintenanceStatus('m1', ''), ApiError);
  assert.equal(requests.length, 0);
});
