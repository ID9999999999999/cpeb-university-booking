import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const apiBaseUrl = normalizeApiBaseUrl(process.env.CPEB_API_BASE_URL || 'http://localhost:3000');
const apiOrigin = new URL(apiBaseUrl).origin;
const production = process.env.NODE_ENV === 'production';

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
]);

function normalizeApiBaseUrl(value) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('CPEB_API_BASE_URL must use http or https');
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function securityHeaders() {
  const connectSources = ["'self'", apiOrigin];
  const headers = {
    'Content-Security-Policy': [
      "default-src 'self'",
      "base-uri 'none'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      `connect-src ${connectSources.join(' ')}`,
      "img-src 'self' data:",
      "style-src 'self'",
      "script-src 'self'"
    ].join('; '),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
  };
  if (production) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  return headers;
}

function safePath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const requested = decoded === '/' ? '/index.html' : decoded;
  const normalized = normalize(requested).replace(/^([/\\])+/, '');
  if (normalized.includes('..')) return null;
  return join(root, normalized);
}

const server = createServer(async (request, response) => {
  const headers = securityHeaders();
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);

  if (!request.url || !['GET', 'HEAD'].includes(request.method || '')) {
    response.statusCode = 405;
    response.setHeader('Allow', 'GET, HEAD');
    response.end('Method Not Allowed');
    return;
  }

  const url = new URL(request.url, 'http://localhost');

  if (url.pathname === '/runtime-config.js') {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    response.end(`globalThis.CPEB_ADMIN_CONFIG = Object.freeze(${JSON.stringify({ apiBaseUrl })});\n`);
    return;
  }

  const filePath = safePath(url.pathname);
  if (!filePath || !filePath.startsWith(root)) {
    response.statusCode = 400;
    response.end('Bad Request');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    const data = await readFile(filePath);
    response.statusCode = 200;
    response.setHeader('Content-Type', mimeTypes.get(extname(filePath)) || 'application/octet-stream');
    if (request.method === 'HEAD') response.end();
    else response.end(data);
  } catch {
    response.statusCode = 404;
    response.end('Not Found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`CPEB Admin Web listening on :${port}`);
  console.log(`API base URL: ${apiBaseUrl}`);
});
