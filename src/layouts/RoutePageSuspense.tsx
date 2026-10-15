import React, { Suspense } from 'react';
import { IonContent, IonPage } from '@ionic/react';

interface RoutePageSuspenseProps {
  children: React.ReactNode;
  loadingLabel: string;
}

export const RoutePageSuspense: React.FC<RoutePageSuspenseProps> = ({ children, loadingLabel }) => (
  <Suspense
    fallback={
      <IonPage className="route-loading-page">
        <IonContent>
          <section className="route-loading-skeleton" role="status" aria-live="polite">
            <div className="route-loading-skeleton__heading">
              <span className="route-loading-skeleton__mark" aria-hidden="true" />
              <div>
                <span className="route-loading-skeleton__title" aria-hidden="true" />
                <span className="route-loading-skeleton__subtitle" aria-hidden="true" />
              </div>
            </div>
            <div className="route-loading-skeleton__grid" aria-hidden="true">
              <span className="route-loading-skeleton__card" />
              <span className="route-loading-skeleton__card" />
              <span className="route-loading-skeleton__card" />
            </div>
            <span className="route-loading-skeleton__label">{loadingLabel}</span>
          </section>
        </IonContent>
      </IonPage>
    }
  >
    {children}
  </Suspense>
);
