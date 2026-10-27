import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSignInButton } from './GoogleSignInButton';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('GoogleSignInButton rollout gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stays hidden when a client ID exists but release entry is disabled', () => {
    vi.stubEnv('VITE_GOOGLE_WEB_CLIENT_ID', 'configured-client');
    vi.stubEnv('VITE_GOOGLE_ENTRY_ENABLED', 'false');

    render(
      <GoogleSignInButton onCredential={vi.fn()} onCancel={vi.fn()} onError={vi.fn()} />
    );

    expect(screen.queryByLabelText('auth.googleSignIn')).toBeNull();
  });
});
