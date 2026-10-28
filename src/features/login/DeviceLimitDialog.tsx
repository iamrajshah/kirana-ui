import React from 'react';
import { IonButton, IonModal } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import type { ActiveDevice, DeviceLimitDetails } from '@core/api/authApi';

export const DeviceLimitDialog: React.FC<{
  details: DeviceLimitDetails | null;
  busy?: boolean;
  onReplace: (device: ActiveDevice) => void;
  onCancel: () => void;
}> = ({ details, busy = false, onReplace, onCancel }) => {
  const { t } = useTranslation();
  return (
    <IonModal isOpen={Boolean(details)} onDidDismiss={onCancel}>
      <div className="ion-padding">
        <h2>{t('security.deviceLimitTitle')}</h2>
        <p>{t('security.deviceLimitDescription', { limit: details?.limit ?? 0 })}</p>
        <div className="space-y-3">
          {(details?.devices ?? []).map((device) => (
            <div key={device.id} className="rounded border p-3">
              <strong>{device.name}</strong>
              <div className="text-sm">
                {t(`security.platform.${device.platform.toLowerCase()}`)} ·{' '}
                {t('security.lastSeen', {
                  date: new Date(device.lastSeenAt).toLocaleString(),
                })}
              </div>
              <IonButton
                expand="block"
                fill="outline"
                disabled={busy}
                onClick={() => onReplace(device)}
              >
                {t('security.replaceDevice')}
              </IonButton>
            </div>
          ))}
        </div>
        <IonButton expand="block" fill="clear" disabled={busy} onClick={onCancel}>
          {t('common.cancel')}
        </IonButton>
      </div>
    </IonModal>
  );
};
