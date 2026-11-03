import React from 'react';
import { IonButton, IonContent, IonPage, IonSpinner } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { useLogoutMutation } from '@core/api/authApi';
import { logout } from '@core/auth/authSlice';
import { ROUTES } from '@core/constants';
import { useAppDispatch, useAppSelector } from '@core/hooks';

export const ProvisioningRecoveryPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);
  const [logoutRequest, logoutState] = useLogoutMutation();

  const continueSetup = async () => {
    try {
      await logoutRequest({
        scope: 'current',
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
      }).unwrap();
    } catch {
      // A stale or partially provisioned server session must not trap the user.
      // Local credentials are cleared below so Google can resume setup safely.
    }

    dispatch(logout());
    history.replace(ROUTES.LOGIN);
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <main className="mx-auto flex min-h-full max-w-2xl items-center py-8">
          <section className="w-full rounded-3xl border border-[color:var(--ion-color-primary)] bg-[var(--ion-card-background)] p-6 shadow-lg sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ion-color-primary)]">
              {t('provisioningRecovery.eyebrow')}
            </p>
            <h1 className="mt-2 text-3xl font-bold">{t('provisioningRecovery.title')}</h1>
            <p className="mt-3 text-base">{t('provisioningRecovery.description')}</p>

            <ol className="mt-6 space-y-3 rounded-2xl bg-[var(--ion-background-color)] p-4">
              <li>{t('provisioningRecovery.stepOne')}</li>
              <li>{t('provisioningRecovery.stepTwo')}</li>
              <li>{t('provisioningRecovery.stepThree')}</li>
            </ol>

            <IonButton
              className="mt-6"
              expand="block"
              size="large"
              disabled={logoutState.isLoading}
              onClick={() => void continueSetup()}
            >
              {logoutState.isLoading ? (
                <IonSpinner name="crescent" aria-label={t('common.loading')} />
              ) : (
                t('provisioningRecovery.continue')
              )}
            </IonButton>
            <p className="mt-4 text-center text-sm text-[var(--ion-color-medium)]">
              {t('provisioningRecovery.safe')}
            </p>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};
