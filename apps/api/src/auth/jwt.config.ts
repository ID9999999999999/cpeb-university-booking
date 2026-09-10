import 'dotenv/config';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    if (process.env.NODE_ENV === 'production' && secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production.');
    }
    return secret;
  }
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return 'cpeb-development-secret-not-for-production';
  }
  throw new Error(
    'JWT_SECRET is required unless NODE_ENV is explicitly development or test.',
  );
}

export function getJwtExpiresInSeconds() {
  const raw = Number(process.env.JWT_EXPIRES_IN_SECONDS || 7200);
  if (!Number.isInteger(raw) || raw < 300 || raw > 86400) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be an integer between 300 and 86400.');
  }
  return raw;
}
