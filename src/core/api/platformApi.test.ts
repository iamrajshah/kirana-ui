import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { platformApi } from './platformApi';
import { STORAGE_KEYS } from '@core/constants';

describe('platformApi', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps Platform Admin authentication separate from POS tokens', async () => {
    localStorage.setItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN, 'platform-token');
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { 'content-type': 'application/json' },
      })
    );

    await platformApi.listTenants('Shah');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/platform/tenants?search=Shah'),
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer platform-token' }),
      })
    );
  });

  it('clears only platform credentials after an unauthorized response', async () => {
    localStorage.setItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN, 'expired');
    localStorage.setItem(STORAGE_KEYS.PLATFORM_ADMIN, '{}');
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'pos-token');
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'Expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(platformApi.listTenants()).rejects.toThrow('Expired');

    expect(localStorage.getItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.PLATFORM_ADMIN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('pos-token');
  });

  it('loads tenant details and resets an owner password through platform endpoints', async () => {
    localStorage.setItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN, 'platform-token');
    vi.mocked(fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ success: true, data: {} }), {
        headers: { 'content-type': 'application/json' },
      })
    );

    await platformApi.getTenantDetails('11');
    await platformApi.resetOwnerPassword('11', 'Welcome1!');

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/platform/tenants/11'),
      expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer platform-token' }) })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/platform/tenants/11/owner-password'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ temporaryPassword: 'Welcome1!' }) })
    );
  });
});
