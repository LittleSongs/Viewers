import { buildAuthHeaders, getNdtRuntimeConfig, normalizeRuoyiApiBase } from './ndtClient';

describe('ndtClient runtime config', () => {
  it('uses localhost RuoYi defaults when URL params are absent', () => {
    const config = getNdtRuntimeConfig({
      search: '',
      storage: null,
    });

    expect(config.ruoyiApiBase).toBe('http://localhost:8080');
    expect(config.taskId).toBeUndefined();
    expect(config.canEvaluate).toBe(false);
    expect(config.token).toBeUndefined();
  });

  it('parses RuoYi URL params and normalizes trailing slashes', () => {
    const config = getNdtRuntimeConfig({
      search:
        '?taskId=1001&canEvaluate=true&token=abc123&ruoyiApiBase=http%3A%2F%2Flocalhost%3A8080%2F',
      storage: null,
    });

    expect(config.ruoyiApiBase).toBe('http://localhost:8080');
    expect(config.taskId).toBe(1001);
    expect(config.canEvaluate).toBe(true);
    expect(config.token).toBe('abc123');
  });

  it('falls back to localStorage token names when URL token is absent', () => {
    const storage = {
      getItem: jest.fn(key => (key === 'Admin-Token' ? 'stored-token' : null)),
    } as unknown as Storage;

    const config = getNdtRuntimeConfig({
      search: '?taskId=12',
      storage,
    });

    expect(config.token).toBe('stored-token');
  });

  it('builds Bearer authorization headers without duplicating the scheme', () => {
    expect(buildAuthHeaders('plain-token')).toEqual({
      Authorization: 'Bearer plain-token',
    });
    expect(buildAuthHeaders('Bearer existing-token')).toEqual({
      Authorization: 'Bearer existing-token',
    });
  });

  it('normalizes empty or whitespace API bases to the default URL', () => {
    expect(normalizeRuoyiApiBase('  ')).toBe('http://localhost:8080');
  });
});
