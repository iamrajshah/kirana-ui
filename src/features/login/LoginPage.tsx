import React, { useState } from 'react';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useLoginMutation } from '@core/api/authApi';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { setCredentials } from '@core/auth/authSlice';
import { Button, Input } from '@components';
import { ROUTES, APP_NAME } from '@core/constants';
import { isValidEmail, isValidPhone } from '@utils/helpers';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    console.log('=== handleLogin CALLED ===');
    setError('');

    console.log('emailOrPhone:', emailOrPhone, 'password:', password);
    if (!emailOrPhone || !password) {
      console.log('Missing fields');
      setError('Please fill in all fields');
      return;
    }

    try {
      const credentials = isValidEmail(emailOrPhone)
        ? { email: emailOrPhone, password }
        : isValidPhone(emailOrPhone)
        ? { phone: emailOrPhone, password }
        : { email: emailOrPhone, password };

      console.log('Attempting login with:', credentials);
      const response = await login(credentials).unwrap();
      console.log('Login response:', response);
      
      if (response.success && response.data) {
        console.log('Dispatching credentials:', response.data);
        dispatch(setCredentials(response.data));
        console.log('Credentials dispatched');
        
        // Check localStorage immediately
        const token = localStorage.getItem('access_token');
        console.log('Token in localStorage:', token);
        
        console.log('About to navigate to /dashboard');
        // Force navigation using window.location
        setTimeout(() => {
          console.log('Executing navigation NOW');
          window.location.href = '/dashboard';
        }, 500);
      } else {
        console.error('Login response not successful:', response);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.data?.message || t('auth.loginError'));
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
          <div className="w-full max-w-md">
            {/* App Logo/Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-primary-600 mb-2">{APP_NAME}</h1>
              <p className="text-gray-500">{t('common.appName')}</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-6 text-center">{t('auth.login')}</h2>

              <Input
                label={t('auth.emailOrPhone')}
                value={emailOrPhone}
                onChange={setEmailOrPhone}
                type="text"
                placeholder="email@example.com or 9876543210"
                required
              />

              <Input
                label={t('auth.password')}
                value={password}
                onChange={setPassword}
                type="password"
                placeholder="Enter password"
                required
              />

              <Button
                type="submit"
                loading={isLoading}
                fullWidth
                size="large"
                className="mt-4"
              >
                {t('auth.loginButton')}
              </Button>
            </form>

            {/* Version Info */}
            <div className="text-center mt-8 text-sm text-gray-500">
              Version {import.meta.env.VITE_APP_VERSION}
            </div>
          </div>
        </div>

        <IonToast
          isOpen={!!error}
          onDidDismiss={() => setError('')}
          message={error}
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};
