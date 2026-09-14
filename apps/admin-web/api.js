export const ALLOWED_ADMIN_ROLES = Object.freeze(['ADMIN', 'LAB_MANAGER']);

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function normalizeBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing API base URL');
  const parsed = new URL(value.trim());
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('API base URL must use http or https');
  parsed.search = '';
  parsed.hash = '';
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  return parsed.toString().replace(/\/$/, '');
}

export function isAllowedAdminRole(role) {
  return ALLOWED_ADMIN_ROLES.includes(role);
}

export function extractErrorMessage(body, fallback = 'Request failed') {
  if (!body || typeof body !== 'object') return fallback;
  if (Array.isArray(body.message)) return body.message.filter(Boolean).join(', ') || fallback;
  if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
  if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
  return fallback;
}

export class CpebAdminApi {
  #baseUrl;
  #token = null;
  #fetch;

  constructor(baseUrl, fetchImpl = globalThis.fetch) {
    this.#baseUrl = normalizeBaseUrl(baseUrl);
    if (typeof fetchImpl !== 'function') throw new Error('Fetch implementation is required');
    this.#fetch = fetchImpl;
  }

  get baseUrl() {
    return this.#baseUrl;
  }

  hasSession() {
    return Boolean(this.#token);
  }

  clearSession() {
    this.#token = null;
  }

  async login(email, password) {
    const result = await this.#request('/auth/login', {
      method: 'POST',
      body: { email, password },
      authenticated: false,
    });

    if (!result?.accessToken || !result?.user) {
      throw new ApiError('Server returned an invalid authentication response');
    }
    if (!isAllowedAdminRole(result.user.role)) {
      this.clearSession();
      throw new ApiError('This account is not authorized for the administration portal', 403);
    }

    this.#token = result.accessToken;
    try {
      const me = await this.me();
      if (!isAllowedAdminRole(me?.role)) {
        throw new ApiError('This account is not authorized for the administration portal', 403);
      }
      return { ...result, user: me };
    } catch (error) {
      this.clearSession();
      throw error;
    }
  }

  me() {
    return this.#request('/auth/me');
  }

  dashboard() {
    return this.#request('/admin/dashboard');
  }

  pendingBookings() {
    return this.#request('/admin/bookings?status=PENDING');
  }

  equipment({ q = '', category = '', status = '' } = {}) {
    const params = new URLSearchParams();
    const search = typeof q === 'string' ? q.trim().slice(0, 200) : '';
    const categoryValue = typeof category === 'string' ? category.trim().slice(0, 100) : '';
    const statusValue = typeof status === 'string' ? status.trim() : '';
    if (search) params.set('q', search);
    if (categoryValue) params.set('category', categoryValue);
    if (statusValue) params.set('status', statusValue);
    const query = params.toString();
    return this.#request(`/equipment${query ? `?${query}` : ''}`);
  }

  approveBooking(id) {
    return this.#request(`/admin/bookings/${encodeURIComponent(id)}/approve`, { method: 'PATCH' });
  }

  rejectBooking(id, reason = '') {
    const normalized = typeof reason === 'string' ? reason.trim() : '';
    return this.#request(`/admin/bookings/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: normalized ? { reason: normalized } : {},
    });
  }

  async #request(path, options = {}) {
    const { method = 'GET', body, authenticated = true } = options;
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (authenticated) {
      if (!this.#token) throw new ApiError('Authentication is required', 401);
      headers.Authorization = `Bearer ${this.#token}`;
    }

    let response;
    try {
      response = await this.#fetch.call(globalThis, `${this.#baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      });
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Network request failed');
    }

    let payload = null;
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    } else {
      try {
        const text = await response.text();
        payload = text ? { message: text } : null;
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.clearSession();
      throw new ApiError(extractErrorMessage(payload, `Request failed (${response.status})`), response.status, payload);
    }

    return payload;
  }
}
