import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonPage } from '@ionic/react';
import { Navbar } from '@components/Navbar';
import { APP_NAME, APP_VERSION } from '@core/constants';

export const AboutPage: React.FC = () => (
  <IonPage>
    <Navbar title="About" />
    <IonContent className="ion-padding">
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{APP_NAME}</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>Version {APP_VERSION}</IonCardContent>
      </IonCard>
    </IonContent>
  </IonPage>
);
