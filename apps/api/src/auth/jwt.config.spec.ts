import { getJwtSecret } from './jwt.config';

describe('JWT production configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  it('rejects a missing production secret', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET is required in production.');
  });

  it('rejects a short production secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'too-short';
    expect(() => getJwtSecret()).toThrow(
      'JWT_SECRET must be at least 32 characters in production.',
    );
  });

  it('accepts an explicit long production secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    expect(getJwtSecret()).toBe('01234567890123456789012345678901');
  });
});
