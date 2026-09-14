import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiError,
  CpebAdminApi,
  extractErrorMessage,
  isAllowedAdminRole,
  normalizeBaseUrl,
} from '../api.js';

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

test('normalizes API base URLs', () => {
  assert.equal(normalizeBaseUrl('https://api.example.test///'), 'https://api.example.test');
  assert.throws(() => normalizeBaseUrl('javascript:alert(1)'), /http or https/);
});

test('only ADMIN and LAB_MANAGER are accepted', () => {
  assert.equal(isAllowedAdminRole('ADMIN'), true);
  assert.equal(isAllowedAdminRole('LAB_MANAGER'), true);
  assert.equal(isAllowedAdminRole('TECHNICIAN'), false);
  assert.equal(isAllowedAdminRole('STUDENT'), false);
});

test('extracts backend validation messages safely', () => {
  assert.equal(extractErrorMessage({ message: ['A', 'B'] }), 'A, B');
  assert.equal(extractErrorMessage({ message: 'Denied' }), 'Denied');
  assert.equal(extractErrorMessage(null, 'Fallback'), 'Fallback');
});

test('calls fetch with globalThis as receiver for browser compatibility', async () => {
  let step = 0;
  function fetchImpl(url) {
    assert.equal(this, globalThis);
    step += 1;
    if (step === 1) return Promise.resolve(jsonResponse(200, { accessToken: 't', user: { role: 'ADMIN' } }));
    return Promise.resolve(jsonResponse(200, { id: 'u1', role: 'ADMIN' }));
  }

  const api = new CpebAdminApi('https://api.example.test', fetchImpl);
  await api.login('a@example.test', 'password');
  assert.equal(step, 2);
});

test('login keeps an allowed token in memory and verifies /auth/me', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/login')) {
      return jsonResponse(200, { accessToken: 'secret-token', user: { role: 'ADMIN' } });
    }
    if (url.endsWith('/auth/me')) {
      assert.equal(options.headers.Authorization, 'Bearer secret-token');
      return jsonResponse(200, { id: 'u1', fullName: 'Admin', email: 'a@example.test', role: 'ADMIN' });
    }
    throw new Error('unexpected request');
  };

  const api = new CpebAdminApi('https://api.example.test', fetchImpl);
  const session = await api.login('a@example.test', 'password');
  assert.equal(session.user.role, 'ADMIN');
  assert.equal(api.hasSession(), true);
  assert.equal(calls.length, 2);
});

test('login rejects non-admin roles without retaining a session', async () => {
  const api = new CpebAdminApi('https://api.example.test', async () =>
    jsonResponse(200, { accessToken: 'student-token', user: { role: 'STUDENT' } }),
  );
  await assert.rejects(api.login('s@example.test', 'password'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    return true;
  });
  assert.equal(api.hasSession(), false);
});

test('401 responses clear the in-memory session', async () => {
  let step = 0;
  const fetchImpl = async () => {
    step += 1;
    if (step === 1) return jsonResponse(200, { accessToken: 't', user: { role: 'ADMIN' } });
    if (step === 2) return jsonResponse(200, { id: 'u1', role: 'ADMIN' });
    return jsonResponse(401, { message: 'Expired' });
  };
  const api = new CpebAdminApi('https://api.example.test', fetchImpl);
  await api.login('a@example.test', 'password');
  assert.equal(api.hasSession(), true);
  await assert.rejects(api.dashboard(), /Expired/);
  assert.equal(api.hasSession(), false);
});

test('booking history normalizes status filters and authenticates the request', async () => {
  const requests = [];
  let step = 0;
  const fetchImpl = async (url, options) => {
    step += 1;
    if (step === 1) return jsonResponse(200, { accessToken: 't', user: { role: 'ADMIN' } });
    if (step === 2) return jsonResponse(200, { id: 'u1', role: 'ADMIN' });
    requests.push({ url, options });
    return jsonResponse(200, []);
  };

  const api = new CpebAdminApi('https://api.example.test', fetchImpl);
  await api.login('a@example.test', 'password');
  await api.bookings('  approved  ');

  assert.equal(requests[0].url, 'https://api.example.test/admin/bookings?status=APPROVED');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer t');
});

test('booking history supports all statuses and pending helper remains scoped', async () => {
  const requests = [];
  let step = 0;
  const fetchImpl = async (url, options) => {
    step += 1;
    if (step === 1) return jsonResponse(200, { accessToken: 't', user: { role: 'LAB_MANAGER' } });
    if (step === 2) return jsonResponse(200, { id: 'u1', role: 'LAB_MANAGER' });
    requests.push({ url, options });
    return jsonResponse(200, []);
  };

  const api = new CpebAdminApi('https://api.example.test', fetchImpl);
  await api.login('m@example.test', 'password');
  await api.bookings();
  await api.pendingBookings();

  assert.equal(requests[0].url, 'https://api.example.test/admin/bookings');
  assert.equal(requests[1].url, 'https://api.example.test/admin/bookings?status=PENDING');
});

test('equipment inventory encodes bounded search, category and status filters', async () => {
  const requests = [];
  let step = 0;
  const fetchImpl = async (url, options) => {
    step += 1;
    if (step === 1) return jsonResponse(200, { accessToken: 't', user: { role: 'ADMIN' } });
    if (step === 2) return jsonResponse(200, { id: 'u1', role: 'ADMIN' });
    requests.push({ url, options });
    return jsonResponse(200, []);
  };

  const api = new CpebAdminApi('https://api.example.test', fetchImpl);
  await api.login('a@example.test', 'password');
  await api.equipment({ q: '  3D printer & kit  ', category: ' LAB ', status: 'AVAILABLE' });

  assert.equal(
    requests[0].url,
    'https://api.example.test/equipment?q=3D+printer+%26+kit&category=LAB&status=AVAILABLE',
  );
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer t');
});

test('equipment inventory omits empty filters', async () => {
  const requests = [];
  let step = 0;
  const fetchImpl = async (url, options) => {
    step += 1;
    if (step === 1) return jsonResponse(200, { accessToken: 't', user: { role: 'LAB_MANAGER' } });
    if (step === 2) return jsonResponse(200, { id: 'u1', role: 'LAB_MANAGER' });
    requests.push({ url, options });
    return jsonResponse(200, []);
  };

  const api = new CpebAdminApi('https://api.example.test', fetchImpl);
  await api.login('m@example.test', 'password');
  await api.equipment();
  assert.equal(requests[0].url, 'https://api.example.test/equipment');
});

test('equipment status updates use encoded IDs and normalized status JSON', async () => {
  const requests = [];
  let step = 0;
  const fetchImpl = async (url, options) => {
    step += 1;
    if (step === 1) return jsonResponse(200, { accessToken: 't', user: { role: 'ADMIN' } });
    if (step === 2) return jsonResponse(200, { id: 'u1', role: 'ADMIN' });
    requests.push({ url, options });
    return jsonResponse(200, { decision: 'EQUIPMENT_STATUS_UPDATED' });
  };

  const api = new CpebAdminApi('https://api.example.test', fetchImpl);
  await api.login('a@example.test', 'password');
  await api.updateEquipmentStatus('equipment id/1', '  retired  ');

  assert.equal(requests[0].url, 'https://api.example.test/equipment/equipment%20id%2F1/status');
  assert.equal(requests[0].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(requests[0].options.body), { status: 'RETIRED' });
});

test('equipment status updates reject empty status before any request', async () => {
  let step = 0;
  const api = new CpebAdminApi('https://api.example.test', async () => {
    step += 1;
    if (step === 1) return jsonResponse(200, { accessToken: 't', user: { role: 'ADMIN' } });
    return jsonResponse(200, { id: 'u1', role: 'ADMIN' });
  });
  await api.login('a@example.test', 'password');
  assert.throws(() => api.updateEquipmentStatus('e1', '   '), /status is required/);
  assert.equal(step, 2);
});

test('reject sends a bounded JSON object only when a reason exists', async () => {
  const requests = [];
  let step = 0;
  const fetchImpl = async (url, options) => {
    step += 1;
    if (step === 1) return jsonResponse(200, { accessToken: 't', user: { role: 'LAB_MANAGER' } });
    if (step === 2) return jsonResponse(200, { id: 'u1', role: 'LAB_MANAGER' });
    requests.push({ url, options });
    return jsonResponse(200, { id: 'b1', status: 'REJECTED' });
  };
  const api = new CpebAdminApi('https://api.example.test', fetchImpl);
  await api.login('m@example.test', 'password');
  await api.rejectBooking('booking id', '  Not available  ');
  assert.equal(requests[0].url, 'https://api.example.test/admin/bookings/booking%20id/reject');
  assert.deepEqual(JSON.parse(requests[0].options.body), { reason: 'Not available' });
});
