import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  IonToast,
} from '@ionic/react';
import { alertCircle, cloudDownload, cloudUpload, shieldCheckmark } from 'ionicons/icons';
import { apiErrorMessage } from '@core/services/notificationService';
import {
  useDownloadTenantBackupMutation,
  usePreviewTenantBackupMutation,
  useRestoreTenantBackupMutation,
  type TenantBackupPreview,
} from '@core/api/tenantBackupApi';
import {
  canRestoreBackup,
  isSupportedBackupFile,
  TENANT_BACKUP_MAX_BYTES,
} from './tenantBackup.logic';

interface BackupRestorePanelProps {
  shopName: string;
  disabled?: boolean;
  disabledReason?: string;
}

const PRIMARY_COUNTS = [
  'customers',
  'products',
  'productVariants',
  'inventory',
  'invoices',
  'payments',
];

export const BackupRestorePanel: React.FC<BackupRestorePanelProps> = ({ shopName, disabled = false, disabledReason }) => {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedFileRequest = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TenantBackupPreview | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState<{ text: string; color: 'success' | 'danger' } | null>(
    null
  );
  const [downloadBackup, { isLoading: downloading }] = useDownloadTenantBackupMutation();
  const [previewBackup, { isLoading: previewing }] = usePreviewTenantBackupMutation();
  const [restoreBackup, { isLoading: restoring }] = useRestoreTenantBackupMutation();

  const download = async () => {
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
      setMessage({ text: t('importExport.backupDownloaded'), color: 'success' });
    } catch (error) {
      setMessage({ text: apiErrorMessage(error, t('importExport.backupFailed')), color: 'danger' });
    }
  };

  const selectFile = async (selected: File | undefined) => {
    const requestId = ++selectedFileRequest.current;
    setPreview(null);
    setConfirmation('');
    setAcknowledged(false);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith('.json')) {
      setFile(null);
      setMessage({ text: t('importExport.backupJsonOnly'), color: 'danger' });
      return;
    }
    if (!isSupportedBackupFile(selected)) {
      setFile(null);
      setMessage({
        text: t('importExport.backupTooLarge', {
          size: Math.round(TENANT_BACKUP_MAX_BYTES / 1024 / 1024),
        }),
        color: 'danger',
      });
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setFile(selected);
    try {
      const response = await previewBackup(selected).unwrap();
      if (requestId === selectedFileRequest.current) setPreview(response.data);
    } catch (error) {
      if (requestId !== selectedFileRequest.current) return;
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setMessage({
        text: apiErrorMessage(error, t('importExport.previewFailed')),
        color: 'danger',
      });
    }
  };

  const restore = async () => {
    if (!file || !canRestoreBackup(shopName, confirmation, acknowledged)) return;
    try {
      const response = await restoreBackup({ file, confirmation: confirmation.trim() }).unwrap();
      setMessage({
        text: t('importExport.restoreCompleted', { count: response.data.totalRecords }),
        color: 'success',
      });
      setFile(null);
      setPreview(null);
      setConfirmation('');
      setAcknowledged(false);
      if (fileInput.current) fileInput.current.value = '';
    } catch (error) {
      setMessage({
        text: apiErrorMessage(error, t('importExport.restoreFailed')),
        color: 'danger',
      });
    }
  };

  return (
    <div className="backup-section">
      {disabled && <IonNote color="warning" role="status">{disabledReason}</IonNote>}
      <div className="backup-grid">
        <IonCard className="backup-card backup-card--safe">
          <IonCardHeader>
            <IonIcon icon={shieldCheckmark} className="backup-card__icon" />
            <IonCardTitle>{t('importExport.createBackup')}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>{t('importExport.backupDescription')}</p>
            <IonNote>{t('importExport.backupExcludes')}</IonNote>
            <IonNote color="warning">{t('importExport.backupSensitiveWarning')}</IonNote>
            <IonButton expand="block" onClick={download} disabled={disabled || downloading}>
              {downloading ? (
                <IonSpinner name="crescent" />
              ) : (
                <IonIcon icon={cloudDownload} slot="start" />
              )}
              {t('importExport.downloadBackup')}
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard className="backup-card backup-card--restore">
          <IonCardHeader>
            <IonIcon icon={cloudUpload} className="backup-card__icon" />
            <IonCardTitle>{t('importExport.restoreBackup')}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>{t('importExport.restoreDescription')}</p>
            <input
              ref={fileInput}
              className="backup-file-input"
              type="file"
              accept=".json,application/json"
              onChange={(event) => void selectFile(event.target.files?.[0])}
              disabled={disabled}
            />
            {previewing && (
              <div className="backup-loading">
                <IonSpinner name="crescent" /> {t('importExport.checkingBackup')}
              </div>
            )}
          </IonCardContent>
        </IonCard>
      </div>

      {preview && (
        <IonCard className="backup-preview">
          <IonCardHeader>
            <div className="backup-preview__title">
              <IonCardTitle>{t('importExport.backupPreview')}</IonCardTitle>
              <IonBadge color="success">{t('importExport.verifiedBackup')}</IonBadge>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <div className="backup-preview__meta">
              <span>
                <strong>{t('importExport.backupShop')}:</strong> {preview.tenantName}
              </span>
              <span>
                <strong>{t('importExport.backupDate')}:</strong>{' '}
                {new Date(preview.createdAt).toLocaleString()}
              </span>
              <span>
                <strong>{t('importExport.totalRecordsLabel')}:</strong> {preview.totalRecords}
              </span>
            </div>
            <div className="backup-counts">
              {PRIMARY_COUNTS.map((key) => (
                <div key={key} className="backup-count">
                  <span>{t(`importExport.backupCounts.${key}`)}</span>
                  <strong>{preview.counts[key] ?? 0}</strong>
                </div>
              ))}
            </div>
            <div className="backup-warning">
              <IonIcon icon={alertCircle} />
              <div>
                <strong>{t('importExport.restoreWarningTitle')}</strong>
                <p>{t('importExport.restoreWarning')}</p>
              </div>
            </div>
            <IonItem className="backup-confirmation" lines="none">
              <IonInput
                label={t('importExport.confirmShopName')}
                labelPlacement="stacked"
                value={confirmation}
                placeholder={shopName}
                onIonInput={(event) => setConfirmation(event.detail.value ?? '')}
              />
            </IonItem>
            <IonItem className="backup-acknowledgement" lines="none">
              <IonCheckbox
                slot="start"
                checked={acknowledged}
                onIonChange={(event) => setAcknowledged(event.detail.checked)}
              />
              <IonLabel className="ion-text-wrap">
                {t('importExport.restoreAcknowledgement')}
              </IonLabel>
            </IonItem>
            <IonButton
              expand="block"
              color="danger"
              disabled={restoring || !canRestoreBackup(shopName, confirmation, acknowledged)}
              onClick={() => void restore()}
            >
              {restoring ? <IonSpinner name="crescent" /> : t('importExport.replaceAndRestore')}
            </IonButton>
          </IonCardContent>
        </IonCard>
      )}

      <IonToast
        isOpen={Boolean(message)}
        message={message?.text}
        color={message?.color}
        duration={3000}
        onDidDismiss={() => setMessage(null)}
      />
    </div>
  );
};
