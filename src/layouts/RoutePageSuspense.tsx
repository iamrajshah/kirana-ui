import React, { Suspense } from 'react';
import { IonContent, IonPage } from '@ionic/react';

interface RoutePageSuspenseProps {
  children: React.ReactNode;
  loadingLabel: string;
}

export const RoutePageSuspense: React.FC<RoutePageSuspenseProps> = ({
  children,
  loadingLabel,
}) => (
  <Suspense
    fallback={(
      <IonPage>
        <IonContent>
          <div className="workspace-state" role="status">
            {loadingLabel}
          </div>
        </IonContent>
      </IonPage>
    )}
  >
    {children}
  </Suspense>
);
