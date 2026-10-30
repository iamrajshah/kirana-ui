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

const GOOGLE_SCRIPT_TIMEOUT_MS = 10_000;
let googleIdentityLoad: Promise<GoogleAccounts> | null = null;

const loadGoogleIdentityServices = (): Promise<GoogleAccounts> => {
  if (window.google?.accounts) return Promise.resolve(window.google.accounts);
  if (googleIdentityLoad) return googleIdentityLoad;

  const pending = new Promise<GoogleAccounts>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-kirana-google-identity]'
    );
    const script = existing ?? document.createElement('script');
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeout);
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleFailure);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      script.remove();
      reject(new Error('Google sign-in unavailable'));
    };
    const handleLoad = () => {
      if (settled) return;
      const accounts = window.google?.accounts;
      if (!accounts) {
        fail();
        return;
      }
      settled = true;
      cleanup();
      resolve(accounts);
    };
    const handleFailure = () => fail();
    const timeout = window.setTimeout(fail, GOOGLE_SCRIPT_TIMEOUT_MS);

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleFailure, { once: true });
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.kiranaGoogleIdentity = 'true';
      document.head.appendChild(script);
    }
  });

  googleIdentityLoad = pending;
  void pending.catch(() => {
    if (googleIdentityLoad === pending) googleIdentityLoad = null;
  });
  return pending;
};

export class WebGoogleIdentityProvider implements IdentityCredentialProvider {
  constructor(private readonly clientId: string) {}

  render(target: HTMLElement, callbacks: Parameters<IdentityCredentialProvider['render']>[1]) {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let fallbackResize: (() => void) | null = null;
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
        let renderedWidth = 0;
        const renderButton = () => {
          if (!active) return;
          const width = target.clientWidth || 320;
          if (width === renderedWidth) return;
          renderedWidth = width;
          target.replaceChildren();
          accounts.id.renderButton(target, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            width,
          });
        };
        renderButton();
        if (typeof ResizeObserver === 'function') {
          resizeObserver = new ResizeObserver(renderButton);
          resizeObserver.observe(target);
        } else {
          fallbackResize = renderButton;
          window.addEventListener('resize', fallbackResize);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          callbacks.onError(error instanceof Error ? error.message : 'Google sign-in unavailable');
        }
      });
    return () => {
      active = false;
      resizeObserver?.disconnect();
      if (fallbackResize) window.removeEventListener('resize', fallbackResize);
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
