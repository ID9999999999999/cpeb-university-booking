import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

async function startServer(env = {}) {
  const port = 49173 + Math.floor(Math.random() * 3000);
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), CPEB_API_BASE_URL: 'https://api.example.test', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await Promise.race([
    once(child.stdout, 'data'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('server start timeout')), 3000)),
  ]);
  return { child, port };
}

test('serves runtime config and security headers', async (t) => {
  const { child, port } = await startServer();
  t.after(() => child.kill('SIGTERM'));
  const response = await fetch(`http://127.0.0.1:${port}/runtime-config.js`);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /https:\/\/api\.example\.test/);
  assert.match(response.headers.get('content-security-policy') || '', /connect-src 'self' https:\/\/api\.example\.test/);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('rejects unsupported methods', async (t) => {
  const { child, port } = await startServer();
  t.after(() => child.kill('SIGTERM'));
  const response = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST' });
  assert.equal(response.status, 405);
});
