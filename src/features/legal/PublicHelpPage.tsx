import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/constants';
import { useGetPublicProductQuery } from '@core/api/lifecycleApi';

export const PublicHelpPage: React.FC<{ page: 'support' | 'deletion' }> = ({ page }) => {
  const { t } = useTranslation();
  const { data } = useGetPublicProductQuery();
  const deletion = page === 'deletion';
  return (
    <IonPage>
      <IonContent className="ion-padding">
        <main className="mx-auto max-w-3xl rounded-xl bg-[var(--ion-card-background)] p-6 shadow-sm">
          <Link to={ROUTES.LOGIN} className="text-[var(--ion-color-primary)]">
            {t('legal.backToLogin')}
          </Link>
          <h1 className="mt-5 text-3xl font-bold">
            {t(deletion ? 'legal.deletionTitle' : 'account.support')}
          </h1>
          <p className="mt-4 leading-7">
            {t(deletion ? 'legal.deletionBody' : 'account.supportPublicHelp')}
          </p>
          <a
            className="mt-6 inline-block text-[var(--ion-color-primary)]"
            href={`mailto:${data?.support.email ?? 'support@kirana.app'}`}
          >
            {t('legal.supportAction')}
          </a>
        </main>
      </IonContent>
    </IonPage>
  );
};
