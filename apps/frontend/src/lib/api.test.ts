import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiFetch } from './api';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns INVALID_RESPONSE when server responds with non-JSON content-type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => '<!DOCTYPE html><html><body>login</body></html>',
      json: async () => {
        throw new Error('should not be called');
      },
    });

    // @ts-expect-error override global fetch for test
    global.fetch = fetchMock;

    const res = await apiFetch('/api/studies/1');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INVALID_RESPONSE');
    expect(res.error?.message).toContain('Expected JSON');
  });
});

