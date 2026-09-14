import assert from 'node:assert/strict';
import test from 'node:test';
import { healthEndpoint, isHealthyPayload, normalizeHealthBaseUrl } from '../health.js';

test('normalizes health API base URL safely', () => {
  assert.equal(normalizeHealthBaseUrl('https://api.example.test///'), 'https://api.example.test');
  assert.equal(normalizeHealthBaseUrl('https://api.example.test/base/'), 'https://api.example.test/base');
  assert.throws(() => normalizeHealthBaseUrl('javascript:alert(1)'), /http or https/);
});

test('builds the health endpoint from the configured API base URL', () => {
  assert.equal(healthEndpoint('https://api.example.test/'), 'https://api.example.test/health');
});

test('accepts only explicit healthy API payloads', () => {
  assert.equal(isHealthyPayload({ status: 'ok' }), true);
  assert.equal(isHealthyPayload({ status: ' OK ' }), true);
  assert.equal(isHealthyPayload({ status: 'degraded' }), false);
  assert.equal(isHealthyPayload(null), false);
});
