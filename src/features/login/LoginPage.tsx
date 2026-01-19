import React, { useState } from 'react';
import { IonContent, IonPage, IonToast, IonSelect, IonSelectOption, IonIcon, IonToggle } from '@ionic/react';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';
import { language as languageIcon, contrast } from 'ionicons/icons';
import { useLoginMutation } from '@core/api/authApi';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { setCredentials } from '@core/auth/authSlice';
import { Button, Input } from '@components';
import { ROUTES, APP_NAME } from '@core/constants';
import { isValidEmail, isValidPhone } from '@utils/helpers';
import { useTheme } from '../../contexts/ThemeContext';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const { theme, toggleTheme } = useTheme();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setSuccess('');

    if (!emailOrPhone || !password) {
      setError(t('auth.fillAllFields') || 'Please fill in all fields');
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
        setSuccess(t('auth.loginSuccess') || 'Login successful!');
        dispatch(setCredentials(response.data));
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setError(response.message || t('auth.loginError') || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Handle different error types
      let errorMessage = t('auth.loginError') || 'Login failed';
      
      if (err?.data?.message) {
        errorMessage = err.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.status === 401) {
        errorMessage = t('auth.invalidCredentials') || 'Invalid email/phone or password';
      } else if (err?.status === 500) {
        errorMessage = t('auth.serverError') || 'Server error. Please try again later.';
      } else if (!navigator.onLine) {
        errorMessage = t('auth.networkError') || 'Network error. Please check your connection.';
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
                  header: 'Select Language',
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
                >
                  {t('auth.loginButton')}
                </Button>
              </div>
            </form>

            {/* Version Info */}
            <div className="text-center mt-8 text-sm" style={{ color: 'var(--ion-color-medium)' }}>
              Version {import.meta.env.VITE_APP_VERSION}
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
        
        <IonToast
          isOpen={!!success}
          onDidDismiss={() => setSuccess('')}
          message={success}
          duration={2000}
          color="success"
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};
