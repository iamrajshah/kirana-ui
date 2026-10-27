export type IdentityCredential = { credential: string; source: 'web' | 'android' };

export interface IdentityCredentialProvider {
  render(
    target: HTMLElement,
    callbacks: {
      onCredential: (identity: IdentityCredential) => void;
      onCancel: () => void;
      onError: (message: string) => void;
    }
  ): () => void;
}

type GoogleAccounts = {
  id: {
    initialize(options: {
      client_id: string;
      callback: (response: { credential?: string }) => void;
    }): void;
    renderButton(target: HTMLElement, options: object): void;
    prompt(
      callback: (notification: { isDismissedMoment(): boolean; isSkippedMoment(): boolean }) => void
    ): void;
    cancel(): void;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

const loadGoogleIdentityServices = (): Promise<GoogleAccounts> =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve(window.google.accounts);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-kirana-google-identity]'
    );
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.kiranaGoogleIdentity = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener(
      'load',
      () =>
        window.google?.accounts
          ? resolve(window.google.accounts)
          : reject(new Error('Google sign-in unavailable')),
      { once: true }
    );
    script.addEventListener('error', () => reject(new Error('Google sign-in unavailable')), {
      once: true,
    });
  });

export class WebGoogleIdentityProvider implements IdentityCredentialProvider {
  constructor(private readonly clientId: string) {}

  render(target: HTMLElement, callbacks: Parameters<IdentityCredentialProvider['render']>[1]) {
    let active = true;
    void loadGoogleIdentityServices()
      .then((accounts) => {
        if (!active) return;
        accounts.id.initialize({
          client_id: this.clientId,
          callback: ({ credential }) =>
            credential
              ? callbacks.onCredential({ credential, source: 'web' })
              : callbacks.onError('Google did not return a credential'),
        });
        accounts.id.renderButton(target, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: target.clientWidth || 320,
        });
        accounts.id.prompt((notification) => {
          if (notification.isDismissedMoment() || notification.isSkippedMoment())
            callbacks.onCancel();
        });
      })
      .catch((error: unknown) =>
        callbacks.onError(error instanceof Error ? error.message : 'Google sign-in unavailable')
      );
    return () => {
      active = false;
      window.google?.accounts.id.cancel();
    };
  }
}

export class AndroidCredentialProvider implements IdentityCredentialProvider {
  constructor(private readonly requestCredential: () => Promise<string | null>) {}
  render(target: HTMLElement, callbacks: Parameters<IdentityCredentialProvider['render']>[1]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Continue with Google';
    button.addEventListener('click', () => {
      void this.requestCredential()
        .then((credential) =>
          credential
            ? callbacks.onCredential({ credential, source: 'android' })
            : callbacks.onCancel()
        )
        .catch(() => callbacks.onError('Google sign-in unavailable'));
    });
    target.replaceChildren(button);
    return () => button.remove();
  }
}
