import React, { useEffect } from 'react';
import { IonSpinner } from '@ionic/react';
import { loadingController } from '@ionic/core/components';
import { defineCustomElement } from '@ionic/core/components/ion-loading.js';
import { useTranslation } from 'react-i18next';

interface LoadingProps {
  isOpen: boolean;
  message?: string;
  /** Only persistent write workflows need to block the whole workspace. */
  overlay?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ isOpen, message, overlay = false }) => {
  const { t } = useTranslation();
  const label = message || t('common.loading');
  useEffect(() => {
    if (!overlay || !isOpen) return;
    let disposed = false;
    let element: HTMLIonLoadingElement | undefined;
    const presentation = (async () => {
      defineCustomElement();
      element = await loadingController.create({ message: label, backdropDismiss: false });
      if (disposed) {
        element.remove();
        return;
      }
      await element.present();
    })();
    const dismiss = async () => {
      // Dismissing before Ionic finishes presenting can strand aria-hidden on
      // the router. Own this instance until its presentation has settled.
      try {
        await presentation;
      } catch {
        /* Also clean up a failed presentation. */
      }
      if (element) {
        try {
          await element.dismiss();
        } finally {
          element.remove();
        }
      }
    };
    void presentation.catch(() => {
      void dismiss().catch(() => undefined);
    });
    return () => {
      disposed = true;
      void dismiss().catch(() => undefined);
    };
  }, [isOpen, label, overlay]);
  if (!isOpen || overlay) return null;
  return (
    <div className="flex items-center justify-center gap-3 p-6" role="status" aria-live="polite">
      <IonSpinner aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
};
