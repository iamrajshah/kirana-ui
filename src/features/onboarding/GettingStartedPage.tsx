import React from 'react';
import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ROUTES } from '@core/constants';
import './GettingStartedPage.css';

export const GettingStartedPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const steps = [
    { key: 'profile', route: ROUTES.PROFILE },
    { key: 'products', route: ROUTES.PRODUCTS },
    { key: 'staff', route: ROUTES.USERS },
    { key: 'shift', route: ROUTES.SHIFTS },
    { key: 'sale', route: ROUTES.BILLING },
  ] as const;
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>{t('onboarding.title')}</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <main className="getting-started">
          <header><p>{t('onboarding.eyebrow')}</p><h1>{t('onboarding.heading')}</h1><span>{t('onboarding.description')}</span></header>
          <section className="getting-started__steps">
            {steps.map((step, index) => (
              <IonCard key={step.key}>
                <IonCardContent>
                  <b>{index + 1}</b><div><h2>{t(`onboarding.steps.${step.key}.title`)}</h2><p>{t(`onboarding.steps.${step.key}.description`)}</p></div>
                  <IonButton fill="outline" onClick={() => history.push(step.route)}>{t('onboarding.open')}</IonButton>
                </IonCardContent>
              </IonCard>
            ))}
          </section>
          <aside className="getting-started__help"><div><h2>{t('onboarding.helpTitle')}</h2><p>{t('onboarding.helpDescription')}</p></div><IonButton onClick={() => history.push(ROUTES.ACCOUNT)}>{t('onboarding.contactSupport')}</IonButton></aside>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default GettingStartedPage;
