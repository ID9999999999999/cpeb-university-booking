export function normalizeHealthBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing API base URL');
  const parsed = new URL(value.trim());
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('API base URL must use http or https');
  parsed.search = '';
  parsed.hash = '';
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  return parsed.toString().replace(/\/$/, '');
}

export function healthEndpoint(baseUrl) {
  return `${normalizeHealthBaseUrl(baseUrl)}/health`;
}

export function isHealthyPayload(payload) {
  return typeof payload?.status === 'string' && payload.status.trim().toLowerCase() === 'ok';
}

function formatCheckedTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function setVisualState(state, label, checkedAt) {
  const wrapper = document.getElementById('service-health');
  const labelElement = document.getElementById('service-health-label');
  const timeElement = document.getElementById('service-health-time');
  if (!wrapper || !labelElement || !timeElement) return;

  wrapper.classList.remove('is-checking', 'is-online', 'is-offline');
  wrapper.classList.add(`is-${state}`);
  labelElement.textContent = label;
  timeElement.textContent = checkedAt ? `Checked ${formatCheckedTime(checkedAt)}` : 'Checking university API…';
}

export async function checkUniversityHealth({ fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const config = globalThis.CPEB_ADMIN_CONFIG || {};
  const checkedAt = now();
  setVisualState('checking', 'Checking services…', null);

  try {
    if (typeof fetchImpl !== 'function') throw new Error('Fetch implementation is required');
    const response = await fetchImpl.call(globalThis, healthEndpoint(config.apiBaseUrl || 'http://localhost:3000'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error(`Health request failed (${response.status})`);
    const payload = await response.json();
    if (!isHealthyPayload(payload)) throw new Error('University API did not report healthy status');
    setVisualState('online', 'University services online', checkedAt);
    return true;
  } catch {
    setVisualState('offline', 'University services offline', checkedAt);
    return false;
  }
}

function installOperationsLink() {
  const accountArea = document.querySelector('.account-area');
  const logoutButton = document.getElementById('logout-button');
  if (!accountArea || !logoutButton || document.getElementById('operations-center-link')) return;
  const link = document.createElement('a');
  link.id = 'operations-center-link';
  link.className = 'operations-center-link';
  link.href = '/operations.html';
  link.textContent = 'Operations';
  link.setAttribute('aria-label', 'Open repair reports and maintenance Operations Center');
  accountArea.insertBefore(link, logoutButton);
}

if (typeof document !== 'undefined') {
  const start = () => {
    installOperationsLink();
    void checkUniversityHealth();
    globalThis.setInterval(() => void checkUniversityHealth(), 60_000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
