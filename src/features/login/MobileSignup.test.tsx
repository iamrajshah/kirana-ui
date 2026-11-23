vi.mock('@core/i18n', () => ({ default: { addResourceBundle: vi.fn() } }));
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MobileSignup } from './MobileSignup';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
vi.mock('@core/workspace/browserWorkspace', () => ({
  runInActiveWorkspace: (fn: () => unknown) => fn(),
}));
vi.mock('./DemoProvisioningPanel', () => ({
  DemoProvisioningPanel: ({ onReady }: { onReady: () => void }) => (
    <button onClick={onReady}>finish-demo</button>
  ),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const legal = {
  privacyVersion: 'v1',
  termsVersion: 'v1',
  privacyUrl: 'https://example.test/privacy',
  termsUrl: 'https://example.test/terms',
};
const mount = (accepted = true) => {
  const ready = vi.fn();
  render(<MobileSignup legal={legal} accepted={accepted} onReady={ready} />);
  fireEvent.click(screen.getByText('mobileSignup.title'));
  return ready;
};
it('requires consent before sending an OTP', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  mount(false);
  fireEvent.click(screen.getByText('mobileSignup.send'));
  expect(fetch).not.toHaveBeenCalled();
});
it('keeps verification purpose separate and offers normal login only after provisioning', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { challengeId: 'staff-id' } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { provisioningToken: 'provision-only' } }),
    });
  vi.stubGlobal('fetch', fetch);
  const ready = mount();
  fireEvent.change(screen.getByLabelText('mobileSignup.name'), { target: { value: 'Owner' } });
  fireEvent.change(screen.getByLabelText('mobileSignup.phone'), {
    target: { value: '9876543210' },
  });
  fireEvent.change(screen.getByLabelText('mobileSignup.password'), {
    target: { value: 'LongPassword123' },
  });
  fireEvent.click(screen.getByText('mobileSignup.send'));
  await screen.findByLabelText('mobileSignup.code');
  expect(fetch.mock.calls[0][0]).toContain('/auth/signup/mobile/request');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    phone: '9876543210',
    name: 'Owner',
    password: 'LongPassword123',
    privacyVersion: 'v1',
    termsVersion: 'v1',
  });
  fireEvent.change(screen.getByLabelText('mobileSignup.code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByText('mobileSignup.verify'));
  await screen.findByText('finish-demo');
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
    challengeId: 'staff-id',
    otp: '123456',
  });
  expect(ready).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('finish-demo'));
  expect(ready).toHaveBeenCalledWith('9876543210', 'LongPassword123');
});
it('shows failed verification without starting a trial or retrying automatically', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: false, json: async () => ({ message: 'Try later' }) });
  vi.stubGlobal('fetch', fetch);
  mount();
  fireEvent.click(screen.getByText('mobileSignup.send'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Try later'));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('finish-demo')).toBeNull();
});

it('shows field validation details instead of only a generic error', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        json: async () => ({
          message: 'Validation failed',
          errors: { password: ['Use at least 10 characters'] },
        }),
      })
  );
  mount();
  fireEvent.click(screen.getByText('mobileSignup.send'));
  expect((await screen.findByRole('alert')).textContent).toBe('Use at least 10 characters');
});
