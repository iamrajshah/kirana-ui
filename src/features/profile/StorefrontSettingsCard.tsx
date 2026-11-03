import React, { useEffect, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonSpinner,
  IonToggle,
} from '@ionic/react';
import { save, storefrontOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import {
  useGetTenantSettingsQuery,
  useUpdateTenantSettingsMutation,
} from '@core/api/tenantSettingsApi';
import { useAppSelector } from '@core/hooks';
import { apiErrorMessage } from '@core/services/notificationService';

export const StorefrontSettingsCard: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);
  const isOwner = user?.roles?.includes('OWNER') ?? false;
  const { data, isLoading, isError, refetch } = useGetTenantSettingsQuery(undefined, {
    skip: !isOwner,
  });
  const [updateSettings, { isLoading: isSaving }] = useUpdateTenantSettingsMutation();
  const [showStockQuantity, setShowStockQuantity] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);

  const persistedValue = data?.data.storefront_show_stock_quantity ?? false;

  useEffect(() => {
    if (data?.data) {
      setShowStockQuantity(data.data.storefront_show_stock_quantity ?? false);
    }
  }, [data]);

  if (!isOwner) return null;

  const handleSave = async () => {
    setNotice(null);
    try {
      await updateSettings({ storefront_show_stock_quantity: showStockQuantity }).unwrap();
      setNotice({ kind: 'success', message: t('storefrontSettings.saved') });
    } catch (error: unknown) {
      setNotice({
        kind: 'error',
        message: apiErrorMessage(error, t('storefrontSettings.saveFailed')),
      });
    }
  };

  return (
    <IonCard className="storefront-settings-card">
      <IonCardHeader>
        <IonCardTitle>
          <IonIcon icon={storefrontOutline} aria-hidden="true" />
          {t('storefrontSettings.title')}
        </IonCardTitle>
        <p>{t('storefrontSettings.description')}</p>
      </IonCardHeader>
      <IonCardContent>
        {isLoading && <IonSpinner aria-label={t('common.loading')} />}
        {isError && (
          <div role="alert" className="storefront-settings-notice storefront-settings-error">
            <p>{t('storefrontSettings.loadFailed')}</p>
            <IonButton fill="outline" onClick={() => refetch()}>
              {t('common.retry')}
            </IonButton>
          </div>
        )}
        {data?.data && (
          <>
            <div className="storefront-settings-control">
              <div>
                <strong>{t('storefrontSettings.showExactStock')}</strong>
                <p>{t('storefrontSettings.showExactStockHelp')}</p>
              </div>
              <IonToggle
                aria-label={t('storefrontSettings.showExactStock')}
                checked={showStockQuantity}
                disabled={isSaving}
                onIonChange={(event) => {
                  setShowStockQuantity(event.detail.checked);
                  setNotice(null);
                }}
              />
            </div>
            <p className="storefront-settings-impact" role="status">
              {showStockQuantity
                ? t('storefrontSettings.impactVisible')
                : t('storefrontSettings.impactHidden')}
            </p>
            {notice && (
              <p
                role={notice.kind === 'error' ? 'alert' : 'status'}
                className={`storefront-settings-notice storefront-settings-${notice.kind}`}
              >
                {notice.message}
              </p>
            )}
            <IonButton
              expand="block"
              disabled={isSaving || showStockQuantity === persistedValue}
              onClick={() => void handleSave()}
            >
              <IonIcon icon={save} slot="start" />
              {isSaving ? t('storefrontSettings.saving') : t('storefrontSettings.save')}
            </IonButton>
          </>
        )}
      </IonCardContent>
    </IonCard>
  );
};
