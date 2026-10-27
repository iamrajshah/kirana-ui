import React, { useEffect, useState } from 'react';
import { apiErrorMessage } from '@core/services/notificationService';
import { useTranslation } from 'react-i18next';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonBadge,
  IonToast,
  IonSpinner,
} from '@ionic/react';
import {
  cloudUpload,
  cloudDownload,
  server,
  document as documentIcon,
  checkmarkCircle,
  closeCircle,
  time,
} from 'ionicons/icons';
import { Navbar } from '@components/Navbar';
import {
  useUploadImportFileMutation,
  useGetImportJobsQuery,
  useCommitImportJobMutation,
  useExportDataMutation,
  type ExportFormat,
  type ExportType,
  type ImportType,
} from '@core/api/importExportApi';
import './ImportExportPage.css';
import { isSupportedImportFile } from '@utils/formValidation';
import {
  canCommitImportJob,
  filterImportJobsByType,
  hasActiveImportJobs,
} from './importExport.logic';
import { BackupRestorePanel } from './BackupRestorePanel';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { selectCommercialAccess } from '@core/auth/authSlice';
import { canUseCommercialFeature } from '@core/commercial/commercialAccess';

type TabType = 'import' | 'export' | 'backup';

export const ImportExportPage: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useAppSelector(selectCurrentUser);
  const commercialAccess = useAppSelector(selectCommercialAccess);
  const isOwner = currentUser?.roles?.includes('OWNER') ?? false;
  const shopName = currentUser?.tenant?.name ?? '';
  const roles = currentUser?.roles ?? [];
  const canAdvancedImport = canUseCommercialFeature(roles, commercialAccess, 'IMPORT_INVENTORY_CATEGORY_SUPPLIER');
  const canCsvExport = canUseCommercialFeature(roles, commercialAccess, 'EXPORT_CSV_SIX_DATASETS');
  const canExcelExport = canUseCommercialFeature(roles, commercialAccess, 'EXPORT_EXCEL');
  const canBackup = canUseCommercialFeature(roles, commercialAccess, 'BACKUP_RESTORE');
  const [selectedTab, setSelectedTab] = useState<TabType>('import');
  const [selectedImportType, setSelectedImportType] = useState<ImportType>('CUSTOMER');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    data: importJobsResponse,
    isLoading: loadingJobs,
    isError: jobsError,
    refetch: refetchJobs,
  } = useGetImportJobsQuery(
    {},
    {
      skip: selectedTab !== 'import',
    }
  );
  const [uploadFile, { isLoading: uploading }] = useUploadImportFileMutation();
  const [commitJob, { isLoading: committing }] = useCommitImportJobMutation();
  const [exportData, { isLoading: exporting }] = useExportDataMutation();

  const importJobs = importJobsResponse?.data || [];
  const filteredImportJobs = filterImportJobsByType(importJobs, selectedImportType);
  const hasActiveJobs = hasActiveImportJobs(filteredImportJobs);

  useEffect(() => {
    if (selectedTab !== 'import' || !hasActiveJobs) return;

    const intervalId = window.setInterval(() => {
      void refetchJobs();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [hasActiveJobs, refetchJobs, selectedTab]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isSupportedImportFile(file.name)) {
        setSelectedFile(null);
        setErrorMessage(t('importExport.unsupportedFile'));
        setShowError(true);
        event.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage(t('importExport.pleaseSelectFile'));
      setShowError(true);
      return;
    }

    try {
      await uploadFile({
        file: selectedFile,
        type: selectedImportType,
      }).unwrap();

      setShowSuccess(true);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: unknown) {
      console.error('❌ Error uploading file:', error);
      setErrorMessage(apiErrorMessage(error, t('importExport.uploadFailed')));
      setShowError(true);
    }
  };

  const handleCommit = async (jobId: string) => {
    try {
      await commitJob(jobId).unwrap();
      setShowSuccess(true);
    } catch (error: unknown) {
      console.error('❌ Error committing job:', error);
      setErrorMessage(apiErrorMessage(error, t('importExport.commitFailed')));
      setShowError(true);
    }
  };

  const handleExport = async (type: ExportType, format: ExportFormat = 'CSV') => {
    try {
      const url = await exportData({ type, format }).unwrap();
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: `${type}_${new Date().toISOString().split('T')[0]}.${format === 'CSV' ? 'csv' : 'xlsx'}`,
      });
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);

      setShowSuccess(true);
    } catch (error: unknown) {
      console.error('❌ Error exporting:', error);
      setErrorMessage(apiErrorMessage(error, t('importExport.exportError'), true));
      setShowError(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'PROCESSING':
        return 'warning';
      default:
        return 'medium';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return checkmarkCircle;
      case 'FAILED':
        return closeCircle;
      default:
        return time;
    }
  };

  return (
    <IonPage>
      <Navbar title={t('importExport.title')} />
      <IonContent>
        <div className="workspace-page">
          <div className="workspace-header">
            <div>
              <h1>{t('importExport.title')}</h1>
              <p>{t('importExport.workspaceDescription')}</p>
            </div>
          </div>
          <IonSegment
            key={selectedTab}
            value={selectedTab}
            onIonChange={(e) => setSelectedTab(e.detail.value as TabType)}
          >
            <IonSegmentButton value="import">
              <IonLabel>{t('importExport.import')}</IonLabel>
              <IonIcon icon={cloudUpload} />
            </IonSegmentButton>
            <IonSegmentButton value="export">
              <IonLabel>{t('importExport.export')}</IonLabel>
              <IonIcon icon={cloudDownload} />
            </IonSegmentButton>
            {isOwner && (
              <IonSegmentButton value="backup">
                <IonLabel>{t('importExport.backup')}</IonLabel>
                <IonIcon icon={server} />
              </IonSegmentButton>
            )}
          </IonSegment>

          {selectedTab === 'import' && (
            <div className="import-section">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>{t('importExport.uploadImportFile')}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonSegment
                    key={selectedImportType}
                    value={selectedImportType}
                    onIonChange={(e) => setSelectedImportType(e.detail.value as ImportType)}
                  >
                    <IonSegmentButton value="CUSTOMER">
                      <IonLabel>{t('importExport.customers')}</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="PRODUCT">
                      <IonLabel>{t('importExport.productsExport')}</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="INVENTORY" disabled={!canAdvancedImport}>
                      <IonLabel>{t('importExport.inventoryExport')}</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="CATEGORY" disabled={!canAdvancedImport}>
                      <IonLabel>{t('importExport.categoriesExport')}</IonLabel>
                    </IonSegmentButton>
                    <IonSegmentButton value="SUPPLIER" disabled={!canAdvancedImport}>
                      <IonLabel>{t('importExport.suppliers')}</IonLabel>
                    </IonSegmentButton>
                  </IonSegment>

                  <div style={{ marginTop: '20px' }}>
                    <input
                      type="file"
                      id="file-upload"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      style={{ display: 'block', marginBottom: '10px' }}
                    />
                    <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)' }}>
                      {t('importExport.supportedFormats')}
                    </p>
                    {selectedFile && (
                      <p style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                        {t('importExport.selectedFile')} {selectedFile.name}
                      </p>
                    )}
                  </div>

                  <IonButton
                    onClick={handleUpload}
                    expand="block"
                    disabled={!selectedFile || uploading}
                    style={{ marginTop: '20px' }}
                  >
                    {uploading ? (
                      <IonSpinner name="crescent" />
                    ) : (
                      <IonIcon icon={cloudUpload} slot="start" />
                    )}
                    {t('importExport.uploadFile')}
                  </IonButton>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>{t('importExport.importHistory')}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {loadingJobs ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <IonSpinner />
                    </div>
                  ) : jobsError ? (
                    <div className="workspace-state">
                      <p>{t('importExport.jobsLoadFailed')}</p>
                      <IonButton onClick={() => refetchJobs()}>{t('common.retry')}</IonButton>
                    </div>
                  ) : filteredImportJobs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)' }}>
                      {t('importExport.noImportJobs')} {selectedImportType.toLowerCase()}
                    </p>
                  ) : (
                    <IonList>
                      {filteredImportJobs.map((job) => (
                        <IonCard key={job.id}>
                          <IonItem lines="none">
                            <IonIcon icon={documentIcon} slot="start" />
                            <IonLabel>
                              <h2>
                                {job.file_url?.split('/').pop() || t('importExport.importFile')}
                              </h2>
                              <p>{job.type || job.import_type}</p>
                              <p style={{ fontSize: '12px' }}>
                                {t('importExport.total')} {job.row_counts.total} |{' '}
                                {t('importExport.valid')} {job.row_counts.valid} |{' '}
                                {t('importExport.invalid')} {job.row_counts.invalid}
                              </p>
                            </IonLabel>
                            <div
                              slot="end"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: '8px',
                              }}
                            >
                              <IonBadge color={getStatusColor(job.status)}>
                                <IonIcon
                                  icon={getStatusIcon(job.status)}
                                  style={{ marginRight: '4px' }}
                                />
                                {job.status}
                              </IonBadge>
                              {canCommitImportJob(job) && (
                                <IonButton
                                  size="small"
                                  disabled={committing}
                                  onClick={() => handleCommit(job.id)}
                                >
                                  {t('importExport.commit')}
                                </IonButton>
                              )}
                            </div>
                          </IonItem>
                        </IonCard>
                      ))}
                    </IonList>
                  )}
                </IonCardContent>
              </IonCard>
            </div>
          )}

          {selectedTab === 'export' && (
            <div className="export-section">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>{t('importExport.exportData')}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{ marginBottom: '20px' }}>{t('importExport.downloadDataFormat')}</p>

                  <div className="export-buttons">
                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>{t('importExport.customers')}</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canCsvExport}
                            onClick={() => handleExport('customers', 'CSV')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.csv')}
                          </IonButton>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canExcelExport}
                            onClick={() => handleExport('customers', 'EXCEL')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.excel')}
                          </IonButton>
                        </div>
                      </IonCardContent>
                    </IonCard>

                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>{t('importExport.productsExport')}</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canCsvExport}
                            onClick={() => handleExport('products', 'CSV')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.csv')}
                          </IonButton>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canExcelExport}
                            onClick={() => handleExport('products', 'EXCEL')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.excel')}
                          </IonButton>
                        </div>
                      </IonCardContent>
                    </IonCard>

                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>{t('importExport.inventoryExport')}</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canCsvExport}
                            onClick={() => handleExport('inventory', 'CSV')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.csv')}
                          </IonButton>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canExcelExport}
                            onClick={() => handleExport('inventory', 'EXCEL')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.excel')}
                          </IonButton>
                        </div>
                      </IonCardContent>
                    </IonCard>

                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>{t('importExport.categoriesExport')}</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canCsvExport}
                            onClick={() => handleExport('categories', 'CSV')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.csv')}
                          </IonButton>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canExcelExport}
                            onClick={() => handleExport('categories', 'EXCEL')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.excel')}
                          </IonButton>
                        </div>
                      </IonCardContent>
                    </IonCard>

                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>{t('importExport.invoicesExport')}</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canCsvExport}
                            onClick={() => handleExport('invoices', 'CSV')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.csv')}
                          </IonButton>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canExcelExport}
                            onClick={() => handleExport('invoices', 'EXCEL')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.excel')}
                          </IonButton>
                        </div>
                      </IonCardContent>
                    </IonCard>

                    <IonCard>
                      <IonCardHeader>
                        <IonCardTitle>{t('importExport.customerLedgerExport')}</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canCsvExport}
                            onClick={() => handleExport('ledger', 'CSV')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.csv')}
                          </IonButton>
                          <IonButton
                            expand="block"
                            disabled={exporting || !canExcelExport}
                            onClick={() => handleExport('ledger', 'EXCEL')}
                          >
                            <IonIcon icon={cloudDownload} slot="start" />
                            {t('importExport.excel')}
                          </IonButton>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </div>
                </IonCardContent>
              </IonCard>
            </div>
          )}

          {selectedTab === 'backup' && isOwner && (
            <BackupRestorePanel
              shopName={shopName}
              disabled={!canBackup}
              disabledReason={t('commercial.upgrade')}
            />
          )}

          <IonToast
            isOpen={showSuccess}
            onDidDismiss={() => setShowSuccess(false)}
            message={t('importExport.operationCompleted')}
            duration={2000}
            color="success"
          />

          <IonToast
            isOpen={showError}
            onDidDismiss={() => setShowError(false)}
            message={errorMessage}
            duration={3000}
            color="danger"
          />
        </div>
      </IonContent>
    </IonPage>
  );
};
