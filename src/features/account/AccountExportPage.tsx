import React, { useState } from 'react';
import { IonButton, IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import { cloudDownload, shieldCheckmark } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@components/Navbar';
import { useDownloadTenantBackupMutation } from '@core/api/tenantBackupApi';
import { apiErrorMessage } from '@core/services/notificationService';

export const AccountExportPage: React.FC = () => {
  const { t } = useTranslation();
  const [downloadBackup, { isLoading }] = useDownloadTenantBackupMutation();
  const [error, setError] = useState('');

  const download = async () => {
    setError('');
    try {
      const url = await downloadBackup().unwrap();
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: `kirana-backup-${new Date().toISOString().slice(0, 10)}.json`,
      });
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (downloadError) {
      setError(apiErrorMessage(downloadError, t('accountExport.failed')));
    }
  };

  return (
    <IonPage>
      <Navbar title={t('accountExport.title')} backHref="/account" />
      <IonContent className="ion-padding">
        <main className="mx-auto max-w-2xl py-8">
          <section className="rounded-3xl bg-[var(--ion-card-background)] p-6 shadow-lg">
            <IonIcon icon={shieldCheckmark} className="text-4xl text-[var(--ion-color-primary)]" />
            <h1 className="mt-3 text-3xl font-bold">{t('accountExport.heading')}</h1>
            <p className="mt-3 text-[var(--ion-color-medium)]">{t('accountExport.description')}</p>
            <p className="mt-3 rounded-xl border border-[var(--ion-color-warning)] p-3 text-sm">
              {t('accountExport.safety')}
            </p>
            {error ? (
              <p
                className="mt-4 rounded-xl bg-[var(--ion-color-danger-tint)] p-3 text-sm text-[var(--ion-color-danger-contrast)]"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <IonButton
              className="mt-6"
              expand="block"
              onClick={() => void download()}
              disabled={isLoading}
            >
              {isLoading ? (
                <IonSpinner name="crescent" />
              ) : (
                <IonIcon icon={cloudDownload} slot="start" />
              )}
              {t('accountExport.download')}
            </IonButton>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
};
