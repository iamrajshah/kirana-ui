import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSignInButton } from './GoogleSignInButton';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const native = vi.hoisted(() => ({ enabled: false }));
const nativeSignIn = vi.hoisted(() => vi.fn());
vi.mock('@core/auth/deviceIdentity', () => ({
  isNativeAndroid: () => native.enabled,
}));
vi.mock('@core/auth/nativeAuthPlugin', () => ({
  KiranaNativeAuth: { signInWithGoogle: nativeSignIn },
}));

describe('GoogleSignInButton rollout gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    native.enabled = false;
    nativeSignIn.mockReset();
  });

  it('stays hidden when a client ID exists but release entry is disabled', () => {
    vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', 'configured-client');
    vi.stubEnv('VITE_GOOGLE_ENTRY_ENABLED', 'false');

    render(
      <GoogleSignInButton onCredential={vi.fn()} onCancel={vi.fn()} onError={vi.fn()} />
    );

    expect(screen.queryByLabelText('auth.googleSignIn')).toBeNull();
  });

  it('uses Android Credential Manager through the native plugin on Android', async () => {
    vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', 'server-client');
    vi.stubEnv('VITE_GOOGLE_ENTRY_ENABLED', 'true');
    native.enabled = true;
    nativeSignIn.mockResolvedValueOnce({ credential: 'android-id-token' });
    const onCredential = vi.fn();

    render(
      <GoogleSignInButton onCredential={onCredential} onCancel={vi.fn()} onError={vi.fn()} />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    await waitFor(() =>
      expect(onCredential).toHaveBeenCalledWith('android-id-token', 'android')
    );
    expect(nativeSignIn).toHaveBeenCalledWith({ serverClientId: 'server-client' });
  });
});
