import React, { useState } from 'react';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@components';
import { platformApi } from '@core/api/platformApi';
import { APP_NAME, ROUTES, STORAGE_KEYS } from '@core/constants';
import './platform.css';

export const PlatformLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await platformApi.login(email, password);
      localStorage.setItem(STORAGE_KEYS.PLATFORM_ACCESS_TOKEN, result.accessToken);
      localStorage.setItem(STORAGE_KEYS.PLATFORM_ADMIN, JSON.stringify(result.admin));
      history.replace(ROUTES.PLATFORM_TENANTS);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('platform.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <main className="platform-login-shell">
          <form className="platform-login-card" onSubmit={submit}>
            <div className="platform-brand-mark" aria-hidden="true">
              {APP_NAME.charAt(0)}
            </div>
            <p className="platform-eyebrow">{APP_NAME}</p>
            <h1>{t('platform.adminTitle')}</h1>
            <p>{t('platform.adminSubtitle')}</p>
            <Input
              label={t('platform.email')}
              value={email}
              onChange={setEmail}
              type="email"
              required
            />
            <Input
              label={t('platform.password')}
              value={password}
              onChange={setPassword}
              type="password"
              required
            />
            <Button type="submit" fullWidth size="large" disabled={loading}>
              {loading ? t('common.loading') : t('platform.signIn')}
            </Button>
          </form>
        </main>
        <IonToast
          isOpen={!!error}
          onDidDismiss={() => setError('')}
          message={error}
          color="danger"
          duration={4000}
        />
      </IonContent>
    </IonPage>
  );
};
