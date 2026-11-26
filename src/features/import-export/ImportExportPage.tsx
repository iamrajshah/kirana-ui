import React, { useEffect, useRef, useState } from 'react';
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
  IonCheckbox,
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
import { SearchableSelect } from '@components/SearchableSelect';
import { Navbar } from '@components/Navbar';
import {
  useUploadImportFileMutation,
  useGetImportJobsQuery,
  useCommitImportJobMutation,
  useGetImportJobQuery,
  useDownloadImportTemplateMutation,
  useDownloadImportReviewMutation,
  useExportDataMutation,
  type ExportFormat,
  type ExportType,
  type ImportType,
  type SellingPriceBasis,
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
  const canAdvancedImport = canUseCommercialFeature(
    roles,
    commercialAccess,
    'IMPORT_INVENTORY_CATEGORY_SUPPLIER'
  );
  const canCsvExport = canUseCommercialFeature(roles, commercialAccess, 'EXPORT_CSV_SIX_DATASETS');
  const canExcelExport = canUseCommercialFeature(roles, commercialAccess, 'EXPORT_EXCEL');
  const canBackup = canUseCommercialFeature(roles, commercialAccess, 'BACKUP_RESTORE');
  const [selectedTab, setSelectedTab] = useState<TabType>('import');
  const [selectedImportType, setSelectedImportType] = useState<ImportType>('CUSTOMER');
  const [sellingPriceBasis, setSellingPriceBasis] = useState<SellingPriceBasis>('UNKNOWN');
  const [autoCreateCategories, setAutoCreateCategories] = useState(true);
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [awaitingValidation, setAwaitingValidation] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const commitGuard = useRef(false);
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
    { type: selectedImportType },
    {
      skip: selectedTab !== 'import',
    }
  );
  const [uploadFile, { isLoading: uploading }] = useUploadImportFileMutation();
  const [commitJob, { isLoading: committing }] = useCommitImportJobMutation();
  const [exportData, { isLoading: exporting }] = useExportDataMutation();
  const [downloadTemplate, { isLoading: downloadingTemplate }] =
    useDownloadImportTemplateMutation();
  const [downloadReview] = useDownloadImportReviewMutation();
  const {
    currentData: reviewResponse,
    isLoading: loadingReview,
    isError: reviewError,
    refetch: refetchReview,
  } = useGetImportJobQuery(reviewJobId ?? '', {
    skip: !reviewJobId,
    pollingInterval: awaitingValidation ? 1500 : 0,
  });
  const review = reviewResponse?.data;

  const importJobs = importJobsResponse?.data || [];
  const visibleJobs =
    review && !importJobs.some((job) => job.id === review.id)
      ? [review, ...importJobs]
      : importJobs;
  const filteredImportJobs = filterImportJobsByType(visibleJobs, selectedImportType);
  const hasActiveJobs = hasActiveImportJobs(filteredImportJobs);

  useEffect(() => {
    if (selectedTab !== 'import' || !hasActiveJobs || awaitingValidation) return;

    const intervalId = window.setInterval(() => {
      void refetchJobs();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [hasActiveJobs, refetchJobs, selectedTab, awaitingValidation]);

  useEffect(() => {
    if (!awaitingValidation || !review || !['COMPLETED', 'FAILED'].includes(review.status)) return;
    setAwaitingValidation(false);
    void refetchJobs();
  }, [awaitingValidation, review, refetchJobs]);

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
      const uploaded = await uploadFile({
        file: selectedFile,
        type: selectedImportType,
        autoCreateCategories: selectedImportType === 'PRODUCT' && autoCreateCategories,
        sellingPriceBasis,
      }).unwrap();

      // A job-ID query cannot join an older in-flight history response.
      setReviewJobId(uploaded.data.id);
      setReviewAccepted(false);
      setAwaitingValidation(true);
      void refetchJobs();
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

  const saveDownload = (url: string, filename: string) => {
    const link = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const handleTemplate = async (profile: 'KIRANA' | 'MARGBOOKS', format: ExportFormat) => {
    try {
      saveDownload(
        await downloadTemplate({ type: selectedImportType, profile, format }).unwrap(),
        `${profile.toLowerCase()}_${selectedImportType.toLowerCase()}_sample.${format === 'EXCEL' ? 'xlsx' : 'csv'}`
      );
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error, t('importExport.templateFailed'), true));
      setShowError(true);
    }
  };
  const handleReviewDownload = async () => {
    if (!reviewJobId) return;
    try {
      saveDownload(await downloadReview(reviewJobId).unwrap(), `import_${reviewJobId}_review.csv`);
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error, t('importExport.templateFailed'), true));
      setShowError(true);
    }
  };
  const handleCommit = async (jobId: string) => {
    if (commitGuard.current || !reviewAccepted) return;
    commitGuard.current = true;
    setBatchRunning(true);
    setImportedCount(0);
    let count = 0;
    let failed = 0;
    try {
      for (;;) {
        const result = (await commitJob(jobId).unwrap()).data;
        count += result.imported;
        failed += result.failed;
        setImportedCount(count);
        await refetchJobs();
        await refetchReview();
        if (result.remaining === 0) break;
        if (result.imported === 0 && result.failed === 0)
          throw new Error(t('importExport.importInProgress'));
      }
      if (failed) {
        setErrorMessage(t('importExport.partialFailure', { count: failed }));
        setShowError(true);
      } else setShowSuccess(true);
      setReviewAccepted(false);
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error, t('importExport.commitFailed')));
      setShowError(true);
    } finally {
      commitGuard.current = false;
      setBatchRunning(false);
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
                    disabled={batchRunning}
                    onIonChange={(e) => {
                      setSelectedImportType(e.detail.value as ImportType);
                      setSelectedFile(null);
                      setReviewJobId(null);
                      setAwaitingValidation(false);
                      setReviewAccepted(false);
                    }}
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

                  <div className="import-template-panel">
                    <h3>{t('importExport.sampleFiles')}</h3>
                    <p>{t('importExport.migrationHelp')}</p>
                    <div className="import-template-actions">
                      <IonButton
                        fill="outline"
                        disabled={downloadingTemplate}
                        onClick={() => handleTemplate('KIRANA', 'CSV')}
                      >
                        {t('importExport.kiranaCsvSample')}
                      </IonButton>
                      <IonButton
                        fill="outline"
                        disabled={downloadingTemplate}
                        onClick={() => handleTemplate('KIRANA', 'EXCEL')}
                      >
                        {t('importExport.kiranaExcelSample')}
                      </IonButton>
                      {['CUSTOMER', 'PRODUCT'].includes(selectedImportType) && (
                        <IonButton
                          fill="outline"
                          disabled={downloadingTemplate}
                          onClick={() => handleTemplate('MARGBOOKS', 'EXCEL')}
                        >
                          {t('importExport.margExcelSample')}
                        </IonButton>
                      )}
                    </div>
                    {selectedImportType === 'PRODUCT' && (
                      <div className="import-price-basis">
                        <SearchableSelect
                          label={t('importExport.priceBasis')}
                          value={sellingPriceBasis}
                          onChange={(value) => setSellingPriceBasis(value as SellingPriceBasis)}
                          disabled={batchRunning || uploading || awaitingValidation}
                          options={[
                            { value: 'UNKNOWN', label: t('importExport.priceBasisUnknown') },
                            { value: 'EXCLUSIVE', label: t('importExport.priceBasisExclusive') },
                            { value: 'INCLUSIVE', label: t('importExport.priceBasisInclusive') },
                          ]}
                        />
                        <p>{t('importExport.priceBasisHelp')}</p>
                      </div>
                    )}
                    {selectedImportType === 'PRODUCT' && (
                      <IonCheckbox
                        checked={autoCreateCategories}
                        labelPlacement="end"
                        onIonChange={(e) => setAutoCreateCategories(e.detail.checked)}
                      >
                        {t('importExport.createCategories')}
                      </IonCheckbox>
                    )}
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <input
                      type="file"
                      id="file-upload"
                      accept=".csv,.xlsx"
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
                    disabled={!selectedFile || uploading || batchRunning || awaitingValidation}
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
                        <IonCard key={job.id} data-import-job-id={job.id}>
                          <IonItem lines="none">
                            <IonIcon icon={documentIcon} slot="start" />
                            <IonLabel>
                              <h2>
                                {job.file_name ||
                                  job.file_url?.split('/').pop() ||
                                  t('importExport.importFile')}
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
                              {['COMPLETED', 'FAILED'].includes(job.status) && (
                                <IonButton
                                  size="small"
                                  disabled={committing || batchRunning}
                                  onClick={() => {
                                    setReviewJobId(job.id);
                                    setReviewAccepted(false);
                                  }}
                                >
                                  {t('importExport.review')}
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

          {selectedTab === 'import' && reviewJobId && (
            <IonCard className="import-review-card">
              <IonCardHeader>
                <IonCardTitle>{t('importExport.review')}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {loadingReview ? (
                  <IonSpinner />
                ) : reviewError ? (
                  <p>{t('importExport.reviewFailed')}</p>
                ) : (
                  review && (
                    <>
                      <p>{t('importExport.reviewHelp')}</p>
                      {awaitingValidation && (
                        <p role="status">{t('importExport.validationProgress')}</p>
                      )}
                      <p>
                        {t('importExport.reviewCounts', {
                          valid: review.row_counts.valid,
                          invalid: review.row_counts.invalid,
                          imported: review.row_counts.imported,
                        })}
                      </p>
                      <p>
                        {t('importExport.formatDetected')}{' '}
                        {[
                          ...new Set(
                            review.rows.map((row) => row.data._import?.format ?? 'KIRANA')
                          ),
                        ]
                          .map((format) => t(`importExport.formats.${format}`))
                          .join(', ')}
                      </p>
                      <IonButton fill="outline" onClick={handleReviewDownload}>
                        {t('importExport.downloadReview')}
                      </IonButton>
                      <p>
                        {t('importExport.firstRows', {
                          count: Math.min(review.rows.length, 100),
                          total: review.rows.length,
                        })}
                      </p>
                      <p>{t('importExport.scrollReview')}</p>
                      <div className="import-review-table">
                        <table>
                          <thead>
                            <tr>
                              <th>{t('importExport.row')}</th>
                              <th>{t('importExport.recordName')}</th>
                              <th>{t('common.status')}</th>
                              <th>{t('importExport.mappedValues')}</th>
                              <th>{t('importExport.notes')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...review.rows]
                              .sort(
                                (a, b) =>
                                  Number(b.status === 'INVALID') - Number(a.status === 'INVALID')
                              )
                              .slice(0, 100)
                              .map((row) => (
                                <tr key={row.row_no}>
                                  <td>{row.row_no}</td>
                                  <td>
                                    {String(
                                      row.data.name ?? row.data.product_name ?? row.data.sku ?? ''
                                    )}
                                  </td>
                                  <td>{row.status}</td>
                                  <td>
                                    {[
                                      'phone',
                                      'credit_balance',
                                      'sku',
                                      'barcode',
                                      'selling_price',
                                      'purchase_price',
                                      'gst_percent',
                                      'hsn_code',
                                      'quantity',
                                      'is_active',
                                    ]
                                      .filter(
                                        (field) =>
                                          row.data[field] !== undefined && row.data[field] !== ''
                                      )
                                      .map((field) => (
                                        <div key={field}>
                                          <strong>{t(`importExport.fieldLabels.${field}`)}:</strong>{' '}
                                          {field === 'is_active'
                                            ? t(
                                                row.data[field]
                                                  ? 'importExport.itemActive'
                                                  : 'importExport.itemInactive'
                                              )
                                            : String(row.data[field])}
                                        </div>
                                      ))}
                                  </td>
                                  <td>
                                    {[row.error_message, ...(row.data._import?.warnings ?? [])]
                                      .filter(Boolean)
                                      .join(' ')}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <p>{t('importExport.sourceRetained')}</p>
                      <IonCheckbox
                        checked={reviewAccepted}
                        disabled={batchRunning}
                        labelPlacement="end"
                        onIonChange={(e) => setReviewAccepted(e.detail.checked)}
                      >
                        {t('importExport.reviewAccept')}
                      </IonCheckbox>
                      <IonButton
                        expand="block"
                        disabled={!reviewAccepted || !canCommitImportJob(review) || batchRunning}
                        onClick={() => handleCommit(review.id)}
                      >
                        {batchRunning ? <IonSpinner /> : t('importExport.commit')}
                      </IonButton>
                      {batchRunning && (
                        <p role="status">
                          {t('importExport.batchProgress', { count: importedCount })}
                        </p>
                      )}
                    </>
                  )
                )}
              </IonCardContent>
            </IonCard>
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
