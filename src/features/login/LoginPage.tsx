import React, { useState } from 'react';
import { IonContent, IonPage, IonToast, IonSelect, IonSelectOption, IonIcon, IonToggle } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { language as languageIcon, contrast } from 'ionicons/icons';
import { useLoginMutation } from '@core/api/authApi';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { setCredentials } from '@core/auth/authSlice';
import { Button, Input } from '@components';
import { APP_NAME, ROUTES } from '@core/constants';
import { isValidEmail, isValidPhone } from '@utils/helpers';
import { apiErrorMessage } from '@core/services/notificationService';
import { useTheme } from '../../contexts/useTheme';
import { useHistory } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const [login, { isLoading }] = useLoginMutation();
  const { theme, toggleTheme } = useTheme();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
        dispatch(setCredentials(response.data));
        history.replace(ROUTES.DASHBOARD);
      } else {
        setError(response.message || t('auth.loginError'));
      }
    } catch (err: unknown) {
      // Handle different error types
      let errorMessage = t('auth.loginError');
      const details = err && typeof err === 'object'
        ? err as { data?: { message?: unknown }; message?: unknown; status?: unknown }
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

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="flex flex-col items-center justify-center min-h-full px-4">
          {/* Language & Theme Selector */}
          <div className="mb-4 flex items-center gap-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--ion-color-light)' }}>
            {/* Language Selector */}
            <div className="flex items-center gap-2 flex-1">
              <IonIcon icon={languageIcon} className="text-xl" style={{ color: 'var(--ion-color-primary)' }} />
              <IonSelect
                value={i18n.language}
                onIonChange={(e) => handleLanguageChange(e.detail.value)}
                interface="action-sheet"
                interfaceOptions={{
                  header: t('foundation.login.selectLanguage'),
                  cssClass: 'language-selector-sheet'
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
              <IonToggle
                checked={theme === 'dark'}
                onIonChange={toggleTheme}
              />
            </div>
          </div>

          <div className="w-full max-w-md">
            {/* App Logo/Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--ion-color-primary)' }}>{APP_NAME}</h1>
              <p style={{ color: 'var(--ion-color-medium)' }}>{t('common.appName')}</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="rounded-lg shadow-md p-6" style={{ backgroundColor: 'var(--ion-card-background)' }}>
              <h2 className="text-2xl font-semibold mb-6 text-center" style={{ color: 'var(--ion-text-color)' }}>{t('auth.login')}</h2>

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

              <div className="mt-4">
                <Button
                  type="submit"
                  fullWidth
                  size="large"
                  loading={isLoading}
                >
                  {t('auth.loginButton')}
                </Button>
              </div>
            </form>

            {/* Version Info */}
            <div className="text-center mt-8 text-sm" style={{ color: 'var(--ion-color-medium)' }}>
              <p>{t('foundation.login.version', { version: import.meta.env.VITE_APP_VERSION || 'dev' })}</p>
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
