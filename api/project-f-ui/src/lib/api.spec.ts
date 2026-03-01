import { describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';

describe('apiFetch', () => {
  it('returns parsed json when request succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, value: 42 }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{ ok: boolean; value: number }>('/plan/optimize');

    expect(result).toEqual({ ok: true, value: 42 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/plan/optimize'),
      expect.objectContaining({
        credentials: 'include',
      }),
    );

    vi.unstubAllGlobals();
  });

  it('throws typed error with status when request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      text: async () => 'already exists',
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/v1/optimizations/abc')).rejects.toMatchObject({
      message: 'already exists',
      status: 409,
    });

    vi.unstubAllGlobals();
  });
});
