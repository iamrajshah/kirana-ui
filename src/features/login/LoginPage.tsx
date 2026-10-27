import React, { useCallback, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonToast,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonToggle,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { language as languageIcon, contrast } from 'ionicons/icons';
import {
  useGoogleExchangeMutation,
  useLinkGoogleMutation,
  useLoginMutation,
  useSelectMembershipMutation,
  type SessionMembership,
} from '@core/api/authApi';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { setCredentials } from '@core/auth/authSlice';
import { Button, Input } from '@components';
import { APP_NAME, ROUTES } from '@core/constants';
import { isValidEmail, isValidPhone } from '@utils/helpers';
import { apiErrorMessage } from '@core/services/notificationService';
import { useTheme } from '../../contexts/useTheme';
import { useHistory } from 'react-router-dom';
import { GoogleSignInButton } from './GoogleSignInButton';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const [login, { isLoading }] = useLoginMutation();
  const [googleExchange, { isLoading: isGoogleLoading }] = useGoogleExchangeMutation();
  const [linkGoogle] = useLinkGoogleMutation();
  const [selectMembership] = useSelectMembershipMutation();
  const { theme, toggleTheme } = useTheme();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleCredential, setGoogleCredential] = useState<{
    credential: string;
    source: 'web' | 'android';
  } | null>(null);
  const [memberships, setMemberships] = useState<SessionMembership[]>([]);
  const [identityOutcome, setIdentityOutcome] = useState<string>('');
  const [linkRequired, setLinkRequired] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'mr', name: 'मराठी' },
    { code: 'gu', name: 'ગુજરાતી' },
  ];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  const handleLogin = async () => {
    setError('');

    if (!emailOrPhone || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }

    try {
      const credentials = isValidEmail(emailOrPhone)
        ? { email: emailOrPhone, password }
        : isValidPhone(emailOrPhone)
          ? { phone: emailOrPhone, password }
          : { email: emailOrPhone, password };

      const response = await login(credentials).unwrap();

      if (response.success && response.data) {
        if (linkRequired && googleCredential) {
          dispatch(setCredentials(response.data));
          const linked = await linkGoogle(googleCredential).unwrap();
          dispatch(setCredentials(linked.data.auth));
          history.replace(
            linked.data.auth.isFirstLogin ? ROUTES.CHANGE_PASSWORD : ROUTES.DASHBOARD
          );
          return;
        }
        dispatch(setCredentials(response.data));
        history.replace(response.data.isFirstLogin ? ROUTES.CHANGE_PASSWORD : ROUTES.DASHBOARD);
      } else {
        setError(response.message || t('auth.loginError'));
      }
    } catch (err: unknown) {
      // Handle different error types
      let errorMessage = t('auth.loginError');
      const details =
        err && typeof err === 'object'
          ? (err as { data?: { message?: unknown }; message?: unknown; status?: unknown })
          : null;
      const parsedMessage = details ? apiErrorMessage(details, '', true) : '';

      if (parsedMessage) {
        errorMessage = parsedMessage;
      } else if (details?.status === 401) {
        errorMessage = t('auth.invalidCredentials');
      } else if (details?.status === 500) {
        errorMessage = t('auth.serverError');
      } else if (!navigator.onLine) {
        errorMessage = t('auth.networkError');
      }

      setError(errorMessage);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  const finishAuthentication = useCallback(
    (auth: Parameters<typeof setCredentials>[0]) => {
      dispatch(setCredentials(auth));
      history.replace(auth.isFirstLogin ? ROUTES.CHANGE_PASSWORD : ROUTES.DASHBOARD);
    },
    [dispatch, history]
  );

  const handleGoogleCredential = useCallback(
    async (credential: string, source: 'web' | 'android' = 'web') => {
      setError('');
      setIdentityOutcome('');
      setLinkRequired(false);
      setGoogleCredential({ credential, source });
      try {
        const response = await googleExchange({ credential, source }).unwrap();
        if (response.data.outcome === 'AUTHENTICATED' && response.data.auth) {
          finishAuthentication(response.data.auth);
        } else if (response.data.outcome === 'MEMBERSHIP_SELECTION_REQUIRED') {
          setMemberships(
            (response.data.memberships ?? []).filter((membership) => membership.active)
          );
        } else if (response.data.outcome === 'PROVISIONING_REQUIRED') {
          setIdentityOutcome(t('auth.privateDemoProvisioning'));
        } else if (response.data.outcome === 'LINK_REQUIRED') {
          setLinkRequired(true);
          setIdentityOutcome(t('auth.googleLinkRequired'));
        }
      } catch (err: unknown) {
        setError(
          apiErrorMessage(
            err && typeof err === 'object' ? (err as never) : {},
            t('auth.googleError'),
            true
          )
        );
      }
    },
    [finishAuthentication, googleExchange, t]
  );

  const handleMembership = async (membership: SessionMembership) => {
    if (!googleCredential) return;
    setError('');
    try {
      const response = await selectMembership({
        ...googleCredential,
        userId: membership.userId,
      }).unwrap();
      if (response.data.auth) finishAuthentication(response.data.auth);
      else setError(t('auth.googleError'));
    } catch (err: unknown) {
      setError(
        apiErrorMessage(
          err && typeof err === 'object' ? (err as never) : {},
          t('auth.googleError'),
          true
        )
      );
    }
  };

  const handleGoogleCancel = useCallback(
    () => setIdentityOutcome(t('auth.googleCancelled')),
    [t]
  );
  const handleGoogleError = useCallback(
    (message: string) => setError(message || t('auth.googleError')),
    [t]
  );

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="flex flex-col items-center justify-center min-h-full px-4">
          {/* Language & Theme Selector */}
          <div
            className="mb-4 flex items-center gap-4 p-3 rounded-lg"
            style={{ backgroundColor: 'var(--ion-color-light)' }}
          >
            {/* Language Selector */}
            <div className="flex items-center gap-2 flex-1">
              <IonIcon
                icon={languageIcon}
                className="text-xl"
                style={{ color: 'var(--ion-color-primary)' }}
              />
              <IonSelect
                value={i18n.language}
                onIonChange={(e) => handleLanguageChange(e.detail.value)}
                interface="action-sheet"
                interfaceOptions={{
                  header: t('foundation.login.selectLanguage'),
                  cssClass: 'language-selector-sheet',
                }}
                className="w-full"
                style={{ padding: 0 }}
              >
                {languages.map((lang) => (
                  <IonSelectOption key={lang.code} value={lang.code}>
                    {lang.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center gap-2">
              <IonIcon icon={contrast} style={{ color: 'var(--ion-color-primary)' }} />
              <IonToggle checked={theme === 'dark'} onIonChange={toggleTheme} />
            </div>
          </div>

          <div className="w-full max-w-md">
            {/* App Logo/Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--ion-color-primary)' }}>
                {APP_NAME}
              </h1>
              <p style={{ color: 'var(--ion-color-medium)' }}>{t('common.appName')}</p>
            </div>

            {/* Login Form */}
            <form
              onSubmit={handleSubmit}
              className="rounded-lg shadow-md p-6"
              style={{ backgroundColor: 'var(--ion-card-background)' }}
            >
              <h2
                className="text-2xl font-semibold mb-6 text-center"
                style={{ color: 'var(--ion-text-color)' }}
              >
                {t('auth.login')}
              </h2>

              <Input
                label={t('auth.emailOrPhone')}
                value={emailOrPhone}
                onChange={setEmailOrPhone}
                type="text"
                placeholder={t('common.placeholders.emailOrPhone')}
                required
              />

              <Input
                label={t('auth.password')}
                value={password}
                onChange={setPassword}
                type="password"
                placeholder={t('common.placeholders.password')}
                required
              />

              <p className="mt-1 text-sm" style={{ color: 'var(--ion-color-medium)' }}>
                {t('auth.temporaryPasswordHelp')}
              </p>

              <div className="mt-4">
                <Button type="submit" fullWidth size="large" loading={isLoading}>
                  {t('auth.loginButton')}
                </Button>
              </div>

              <div className="my-5 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-gray-300" />
                <span>{t('auth.or')}</span>
                <span className="h-px flex-1 bg-gray-300" />
              </div>
              <GoogleSignInButton
                onCredential={handleGoogleCredential}
                onCancel={handleGoogleCancel}
                onError={handleGoogleError}
              />
              {isGoogleLoading && <p role="status">{t('auth.googleLoading')}</p>}
              {identityOutcome && (
                <p role="status" className="mt-3 text-sm">
                  {identityOutcome}
                </p>
              )}
              {memberships.length > 0 && (
                <div className="mt-4" aria-label={t('auth.chooseShop')}>
                  <p>{t('auth.chooseShop')}</p>
                  {memberships.map((membership) => (
                    <button
                      key={`${membership.tenantId}:${membership.userId}`}
                      type="button"
                      onClick={() => void handleMembership(membership)}
                      className="mt-2 w-full rounded border p-2"
                    >
                      {membership.tenantName}
                    </button>
                  ))}
                </div>
              )}
            </form>

            <nav
              aria-label={t('auth.legalAndSupport')}
              className="mt-4 flex flex-wrap justify-center gap-3 text-sm"
            >
              <a href="/privacy">{t('auth.privacy')}</a>
              <a href="/terms">{t('auth.terms')}</a>
              <a href="mailto:support@kirana.app">{t('auth.support')}</a>
              <a href="/privacy#account-deletion">{t('auth.accountDeletion')}</a>
            </nav>

            {/* Version Info */}
            <div className="text-center mt-8 text-sm" style={{ color: 'var(--ion-color-medium)' }}>
              <p>
                {t('foundation.login.version', {
                  version: import.meta.env.VITE_APP_VERSION || 'dev',
                })}
              </p>
              <a
                href="https://github.com/iamrajshah"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block"
              >
                {t('foundation.login.builtBy')}
              </a>
            </div>
          </div>
        </div>

        <IonToast
          isOpen={!!error}
          onDidDismiss={() => setError('')}
          message={error}
          duration={4000}
          color="danger"
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};
