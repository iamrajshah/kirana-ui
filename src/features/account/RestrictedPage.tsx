import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Link, Redirect } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser, selectCommercialAccess } from '@core/auth/authSlice';
import { ROUTES } from '@core/constants';
import { useGetCommercialAccessQuery } from '@core/api/subscriptionApi';

const RESTRICTED_STATES = ['READ_ONLY', 'SUSPENDED', 'CANCELLED', 'EXPIRED', 'PROVISIONING'];

export const RestrictedPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);
  const access = useAppSelector(selectCommercialAccess);
  useGetCommercialAccessQuery(undefined, {
    pollingInterval: 30_000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const owner = user?.roles.includes('OWNER');
  if (access && !RESTRICTED_STATES.includes(access.state)) {
    return <Redirect to={ROUTES.DASHBOARD} />;
  }
  return (
    <IonPage>
      <IonContent className="ion-padding">
        <main className="mx-auto flex min-h-full max-w-2xl items-center">
          <section className="w-full rounded-3xl bg-[var(--ion-card-background)] p-6 shadow-lg">
            <p className="text-sm font-semibold text-[var(--ion-color-primary)]">
              {t('restricted.eyebrow')}
            </p>
            <h1 className="mt-2 text-3xl font-bold">{t('restricted.title')}</h1>
            <p className="mt-3">
              {owner ? t('restricted.ownerDescription') : t('restricted.staffDescription')}
            </p>
            {access ? (
              <p className="mt-3 rounded-xl border p-3 text-sm">
                {t('restricted.status', { state: access.state, plan: access.planCode })}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {owner ? (
                <>
                  <Link
                    className="rounded-lg bg-[var(--ion-color-primary)] px-5 py-3 font-semibold text-white"
                    to={ROUTES.ACCOUNT_RENEWAL}
                  >
                    {t('restricted.renew')}
                  </Link>
                  <Link className="rounded-lg border px-5 py-3 font-semibold" to={ROUTES.ACCOUNT}>
                    {t('restricted.account')}
                  </Link>
                  <Link
                    className="rounded-lg border px-5 py-3 font-semibold"
                    to={ROUTES.ACCOUNT_EXPORT}
                  >
                    {t('restricted.export')}
                  </Link>
                </>
              ) : null}
            </div>
            <p className="mt-6 text-sm">{t('restricted.logoutHelp')}</p>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};
