import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonPage,
} from '@ionic/react';
import { Navbar } from '@components/Navbar';
import { APP_NAME, APP_VERSION } from '@core/constants';
import { useTranslation } from 'react-i18next';

export const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <IonPage>
      <Navbar title={t('about.title')} />
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{APP_NAME}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>{t('about.version', { version: APP_VERSION })}</p>
            <p className="mt-3 text-sm text-gray-600">
              {t('about.builtBy')}{' '}
              <a
                href="https://github.com/iamrajshah"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary-700"
              >
                Rajesh Shah (@iamrajshah)
              </a>
            </p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};
