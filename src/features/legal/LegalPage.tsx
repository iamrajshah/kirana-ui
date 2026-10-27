import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROUTES } from '@core/constants';

export const LegalPage: React.FC<{ document: 'privacy' | 'terms' }> = ({ document }) => {
  const { t } = useTranslation();
  const isPrivacy = document === 'privacy';

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <main className="mx-auto max-w-3xl rounded-xl bg-[var(--ion-card-background)] p-6 shadow-sm">
          <Link to={ROUTES.LOGIN} className="text-sm text-[var(--ion-color-primary)]">
            {t('legal.backToLogin')}
          </Link>
          <h1 className="mt-5 text-3xl font-bold">
            {t(isPrivacy ? 'legal.privacyTitle' : 'legal.termsTitle')}
          </h1>
          <p className="mt-4 leading-7">
            {t(isPrivacy ? 'legal.privacyBody' : 'legal.termsBody')}
          </p>

          {isPrivacy && (
            <section id="account-deletion" className="mt-8 border-t pt-6">
              <h2 className="text-2xl font-semibold">{t('legal.deletionTitle')}</h2>
              <p className="mt-3 leading-7">{t('legal.deletionBody')}</p>
            </section>
          )}

          <a className="mt-8 inline-block text-[var(--ion-color-primary)]" href="mailto:support@kirana.app">
            {t('legal.supportAction')}
          </a>
        </main>
      </IonContent>
    </IonPage>
  );
};
