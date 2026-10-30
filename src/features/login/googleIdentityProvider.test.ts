// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

const accounts = () => ({
  id: {
    initialize: vi.fn(),
    renderButton: vi.fn(),
    prompt: vi.fn(),
    cancel: vi.fn(),
  },
});

describe('WebGoogleIdentityProvider', () => {
  afterEach(() => {
    document
      .querySelectorAll('script[data-kirana-google-identity]')
      .forEach((node) => node.remove());
    delete window.google;
    vi.resetModules();
  });

  it('removes a failed script and succeeds on a later render', async () => {
    const { WebGoogleIdentityProvider } = await import('./googleIdentityProvider');
    const firstError = vi.fn();
    new WebGoogleIdentityProvider('client-id').render(document.createElement('div'), {
      onCredential: vi.fn(),
      onCancel: vi.fn(),
      onError: firstError,
    });
    const failedScript = document.querySelector<HTMLScriptElement>(
      'script[data-kirana-google-identity]'
    );
    expect(failedScript).toBeTruthy();
    failedScript?.dispatchEvent(new Event('error'));
    await vi.waitFor(() => expect(firstError).toHaveBeenCalledWith('Google sign-in unavailable'));
    expect(document.querySelector('script[data-kirana-google-identity]')).toBeNull();

    const googleAccounts = accounts();
    const secondError = vi.fn();
    const target = document.createElement('div');
    new WebGoogleIdentityProvider('client-id').render(target, {
      onCredential: vi.fn(),
      onCancel: vi.fn(),
      onError: secondError,
    });
    const replacement = document.querySelector<HTMLScriptElement>(
      'script[data-kirana-google-identity]'
    );
    expect(replacement).toBeTruthy();
    expect(replacement).not.toBe(failedScript);
    window.google = { accounts: googleAccounts };
    replacement?.dispatchEvent(new Event('load'));

    await vi.waitFor(() => expect(googleAccounts.id.initialize).toHaveBeenCalledTimes(1));
    expect(googleAccounts.id.renderButton).toHaveBeenCalledWith(target, expect.any(Object));
    expect(secondError).not.toHaveBeenCalled();
  });

  it('bounds a script load that never settles', async () => {
    vi.useFakeTimers();
    const { WebGoogleIdentityProvider } = await import('./googleIdentityProvider');
    const onError = vi.fn();
    new WebGoogleIdentityProvider('client-id').render(document.createElement('div'), {
      onCredential: vi.fn(),
      onCancel: vi.fn(),
      onError,
    });

    await vi.advanceTimersByTimeAsync(10_000);

    expect(onError).toHaveBeenCalledWith('Google sign-in unavailable');
    expect(document.querySelector('script[data-kirana-google-identity]')).toBeNull();
    vi.useRealTimers();
  });

  it('renders the explicit button without starting One Tap or reporting a cold-load cancellation', async () => {
    const googleAccounts = accounts();
    window.google = { accounts: googleAccounts };
    const { WebGoogleIdentityProvider } = await import('./googleIdentityProvider');
    const onCancel = vi.fn();
    const target = document.createElement('div');
    Object.defineProperty(target, 'clientWidth', { value: 278 });

    new WebGoogleIdentityProvider('client-id').render(target, {
      onCredential: vi.fn(),
      onCancel,
      onError: vi.fn(),
    });

    await vi.waitFor(() => expect(googleAccounts.id.renderButton).toHaveBeenCalledTimes(1));
    expect(googleAccounts.id.renderButton).toHaveBeenCalledWith(
      target,
      expect.objectContaining({ width: 278 })
    );
    expect(googleAccounts.id.prompt).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
