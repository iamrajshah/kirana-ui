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
});

describe('AndroidCredentialProvider', () => {
  it('returns a native credential with the Android source', async () => {
    const { AndroidCredentialProvider } = await import('./googleIdentityProvider');
    const target = document.createElement('div');
    const onCredential = vi.fn();
    new AndroidCredentialProvider(() => Promise.resolve('android-id-token')).render(target, {
      onCredential,
      onCancel: vi.fn(),
      onError: vi.fn(),
    });

    target.querySelector('button')?.click();

    await vi.waitFor(() =>
      expect(onCredential).toHaveBeenCalledWith({
        credential: 'android-id-token',
        source: 'android',
      })
    );
  });

  it('treats an explicit native cancellation as cancellation', async () => {
    const { AndroidCredentialProvider } = await import('./googleIdentityProvider');
    const target = document.createElement('div');
    const onCancel = vi.fn();
    const onError = vi.fn();
    new AndroidCredentialProvider(() =>
      Promise.reject({ code: 'GOOGLE_SIGN_IN_CANCELLED' })
    ).render(target, {
      onCredential: vi.fn(),
      onCancel,
      onError,
    });

    target.querySelector('button')?.click();

    await vi.waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps missing credentials and provider errors as failures', async () => {
    const { AndroidCredentialProvider } = await import('./googleIdentityProvider');
    const target = document.createElement('div');
    const onCancel = vi.fn();
    const onError = vi.fn();
    new AndroidCredentialProvider(() => Promise.reject({ code: 'GOOGLE_SIGN_IN_FAILED' })).render(
      target,
      {
        onCredential: vi.fn(),
        onCancel,
        onError,
      }
    );

    target.querySelector('button')?.click();

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('Google sign-in unavailable'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
