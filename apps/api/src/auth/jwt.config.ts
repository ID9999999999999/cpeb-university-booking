import 'dotenv/config';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  if (secret) {
    if (process.env.NODE_ENV === 'production' && secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production.');
    }
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }

  return 'cpeb-development-secret';
}
