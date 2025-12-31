import React, { useState } from 'react';
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
  document,
  checkmarkCircle,
  closeCircle,
  time,
} from 'ionicons/icons';
import { Navbar } from '@components/Navbar';
import {
  useUploadImportFileMutation,
  useGetImportJobsQuery,
  useCommitImportJobMutation,
} from '@core/api/importExportApi';
import { API_BASE_URL, STORAGE_KEYS } from '@core/constants';
import './ImportExportPage.css';

type TabType = 'import' | 'export';
type ImportType = 'CUSTOMERS' | 'PRODUCTS' | 'INVENTORY' | 'CATEGORIES';
type ExportType = 'customers' | 'products' | 'inventory' | 'categories' | 'invoices' | 'ledger';

export const ImportExportPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<TabType>('import');
  const [selectedImportType, setSelectedImportType] = useState<ImportType>('CUSTOMERS');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { data: importJobsResponse, isLoading: loadingJobs } = useGetImportJobsQuery({});
  const [uploadFile, { isLoading: uploading }] = useUploadImportFileMutation();
  const [commitJob, { isLoading: committing }] = useCommitImportJobMutation();
  
  const [exportingCustomers, setExportingCustomers] = useState(false);
  const [exportingProducts, setExportingProducts] = useState(false);
  const [exportingInventory, setExportingInventory] = useState(false);
  const [exportingCategories, setExportingCategories] = useState(false);
  const [exportingInvoices, setExportingInvoices] = useState(false);
  const [exportingLedger, setExportingLedger] = useState(false);

  const importJobs = importJobsResponse?.data || [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log('📁 File selected:', file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file');
      setShowError(true);
      return;
    }

    console.log('⬆️ Uploading file:', selectedFile.name, 'Type:', selectedImportType);

    try {
      await uploadFile({
        file: selectedFile,
        importType: selectedImportType,
      }).unwrap();

      setShowSuccess(true);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error('❌ Error uploading file:', error);
      setErrorMessage(error?.data?.message || 'Failed to upload file');
      setShowError(true);
    }
  };

  const handleCommit = async (jobId: string) => {
    console.log('✅ Committing import job:', jobId);

    try {
      await commitJob(jobId).unwrap();
      setShowSuccess(true);
    } catch (error: any) {
      console.error('❌ Error committing job:', error);
      setErrorMessage(error?.data?.message || 'Failed to commit import');
      setShowError(true);
    }
  };

  const handleExport = async (type: ExportType, format: 'CSV' | 'EXCEL' = 'CSV') => {
    console.log('⬇️ Exporting:', type, 'Format:', format);

    // Set loading state
    switch (type) {
      case 'customers':
        setExportingCustomers(true);
        break;
      case 'products':
        setExportingProducts(true);
        break;
      case 'inventory':
        setExportingInventory(true);
        break;
      case 'categories':
        setExportingCategories(true);
        break;
      case 'invoices':
        setExportingInvoices(true);
        break;
      case 'ledger':
        setExportingLedger(true);
        break;
    }

    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const response = await fetch(`${API_BASE_URL}/import/export/${type}?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      
      // Download file using blob
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: `${type}_${new Date().toISOString().split('T')[0]}.${format === 'CSV' ? 'csv' : 'xlsx'}`
      });
      link.click();
      URL.revokeObjectURL(url);
      
      setShowSuccess(true);
    } catch (error: any) {
      console.error('❌ Error exporting:', error);
      setErrorMessage(error?.message || 'Failed to export data');
      setShowError(true);
    } finally {
      // Clear loading state
      setExportingCustomers(false);
      setExportingProducts(false);
      setExportingInventory(false);
      setExportingCategories(false);
      setExportingInvoices(false);
      setExportingLedger(false);
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
      <Navbar title="Import / Export" />
      <IonContent className="ion-padding">
        <IonSegment
          key={selectedTab}
          value={selectedTab}
          onIonChange={(e) => setSelectedTab(e.detail.value as TabType)}
        >
          <IonSegmentButton value="import">
            <IonLabel>IMPORT</IonLabel>
            <IonIcon icon={cloudUpload} />
          </IonSegmentButton>
          <IonSegmentButton value="export">
            <IonLabel>EXPORT</IonLabel>
            <IonIcon icon={cloudDownload} />
          </IonSegmentButton>
        </IonSegment>

        {selectedTab === 'import' && (
          <div className="import-section">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Upload Import File</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonSegment
                  key={selectedImportType}
                  value={selectedImportType}
                  onIonChange={(e) => setSelectedImportType(e.detail.value as ImportType)}
                >
                  <IonSegmentButton value="CUSTOMERS">
                    <IonLabel>Customers</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="PRODUCTS">
                    <IonLabel>Products</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="INVENTORY">
                    <IonLabel>Inventory</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="CATEGORIES">
                    <IonLabel>Categories</IonLabel>
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
                  {selectedFile && (
                    <p style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <IonButton
                  onClick={handleUpload}
                  loading={uploading}
                  expand="block"
                  disabled={!selectedFile}
                  style={{ marginTop: '20px' }}
                >
                  <IonIcon icon={cloudUpload} slot="start" />
                  Upload File
                </IonButton>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Import History</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {loadingJobs ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <IonSpinner />
                  </div>
                ) : importJobs.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)' }}>
                    No import jobs yet
                  </p>
                ) : (
                  <IonList>
                    {importJobs.map((job) => (
                      <IonCard key={job.id}>
                        <IonItem lines="none">
                          <IonIcon icon={document} slot="start" />
                          <IonLabel>
                            <h2>{job.file_name}</h2>
                            <p>{job.import_type}</p>
                            <p style={{ fontSize: '12px' }}>
                              Total: {job.total_rows} | Valid: {job.valid_rows} | Invalid: {job.invalid_rows}
                            </p>
                          </IonLabel>
                          <div slot="end" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <IonBadge color={getStatusColor(job.status)}>
                              <IonIcon icon={getStatusIcon(job.status)} style={{ marginRight: '4px' }} />
                              {job.status}
                            </IonBadge>
                            {job.status === 'PENDING' && job.valid_rows > 0 && (
                              <IonButton
                                size="small"
                                onClick={() => handleCommit(job.id)}
                                loading={committing}
                              >
                                Commit
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
                <IonCardTitle>Export Data</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p style={{ marginBottom: '20px' }}>
                  Download your data in CSV or Excel format
                </p>

                <div className="export-buttons">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Customers</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('customers', 'CSV')}
                          loading={exportingCustomers}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          CSV
                        </IonButton>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('customers', 'EXCEL')}
                          loading={exportingCustomers}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          Excel
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Products</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('products', 'CSV')}
                          loading={exportingProducts}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          CSV
                        </IonButton>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('products', 'EXCEL')}
                          loading={exportingProducts}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          Excel
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Inventory</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('inventory', 'CSV')}
                          loading={exportingInventory}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          CSV
                        </IonButton>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('inventory', 'EXCEL')}
                          loading={exportingInventory}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          Excel
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Categories</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('categories', 'CSV')}
                          loading={exportingCategories}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          CSV
                        </IonButton>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('categories', 'EXCEL')}
                          loading={exportingCategories}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          Excel
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Invoices</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('invoices', 'CSV')}
                          loading={exportingInvoices}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          CSV
                        </IonButton>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('invoices', 'EXCEL')}
                          loading={exportingInvoices}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          Excel
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>

                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Customer Ledger</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('ledger', 'CSV')}
                          loading={exportingLedger}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          CSV
                        </IonButton>
                        <IonButton
                          expand="block"
                          onClick={() => handleExport('ledger', 'EXCEL')}
                          loading={exportingLedger}
                        >
                          <IonIcon icon={cloudDownload} slot="start" />
                          Excel
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message="Operation completed successfully"
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
      </IonContent>
    </IonPage>
  );
};
