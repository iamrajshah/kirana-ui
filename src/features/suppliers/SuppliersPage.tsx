import React, { useState, useEffect } from 'react';
import type { Supplier } from '../../core/api/supplierApi';
import {
  IonPage,
  IonContent,
  IonItem,
  IonLabel,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  RefresherEventDetail,
  IonSelect,
  IonSelectOption,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import { add, close, pencil, cash } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { Navbar } from '@components/Navbar';

import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useMakeSupplierPaymentMutation,
} from '../../core/api/supplierApi';
import { Input, Button, SearchBar } from '../../components';
import { formatCurrency } from '@utils/helpers';
import { useAppSelector } from '../../core/hooks';
import { selectCurrentUser } from '../../core/auth/authSlice';
import { hasPermission } from '../../core/permissions/permissions';
import notificationService from '@core/services/notificationService';
import '../products/stock-workspace.css';

const SuppliersPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const hasCreatePermission = hasPermission(userRoles, 'SUPPLIER_CREATE');
  const hasUpdatePermission = hasPermission(userRoles, 'SUPPLIER_UPDATE');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const limit = 50;
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  const { data, isLoading, isFetching, isError, refetch } = useGetSuppliersQuery({ page, limit });
  const [createSupplier, { isLoading: creating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: updating }] = useUpdateSupplierMutation();
  const [makePayment, { isLoading: processingPayment }] = useMakeSupplierPaymentMutation();

  // Reset pagination when search changes
  useEffect(() => {
    setPage(1);
    setAllSuppliers([]);
  }, [searchTerm]);

  // Accumulate suppliers as they're fetched
  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAllSuppliers(data.data);
      } else {
        setAllSuppliers(prev => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newSuppliers = data.data.filter((s) => !existingIds.has(s.id));
          return [...prev, ...newSuppliers];
        });
      }
    }
  }, [data, page]);

  const total = data?.meta?.total || 0;
  const currentBatchSize = data?.data?.length || 0;
  const hasMore = allSuppliers.length < total && currentBatchSize === limit;

  const loadMore = async (e: CustomEvent) => {
    if (hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
    setTimeout(() => {
      (e.target as HTMLIonInfiniteScrollElement).complete();
    }, 100);
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    setPage(1);
    setAllSuppliers([]);
    await refetch();
    event.detail.complete();
  };

  const handleCreateSupplier = async () => {
    if (!name.trim() || !phone.trim()) {
      notificationService.warning(t('suppliers.fillRequiredFields'));
      return;
    }

    try {
      if (editingSupplier) {
        await updateSupplier({
          id: editingSupplier.id,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
        }).unwrap();
        notificationService.success(t('suppliers.supplierUpdated'));
      } else {
        await createSupplier({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
        }).unwrap();
        notificationService.success(t('suppliers.supplierCreated'));
      }

      resetForm();
      setShowModal(false);
      refetch();
    } catch (error) {
      notificationService.handleApiError(error);
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setPhone(supplier.phone || '');
    setEmail(supplier.email || '');
    setAddress(supplier.address || '');
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
  };

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentMode('CASH');
    setPaymentNotes('');
    setPaymentSupplier(null);
  };

  const handleMakePayment = (supplier: Supplier) => {
    setPaymentSupplier(supplier);
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      notificationService.warning(t('suppliers.enterValidAmount'));
      return;
    }

    try {
      await makePayment({
        id: paymentSupplier.id,
        amount: parseFloat(paymentAmount),
        payment_mode: paymentMode as 'CASH' | 'UPI' | 'CARD' | 'BANK',
        description: paymentNotes.trim() || undefined,
      }).unwrap();

      notificationService.success(t('suppliers.paymentRecordedSuccess'));
      resetPaymentForm();
      setShowPaymentModal(false);
      refetch();
    } catch (error) {
      notificationService.handleApiError(error);
    }
  };

  const filteredSuppliers = allSuppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone.includes(searchTerm)
  );

  return (
    <IonPage>
      <Navbar title={t('suppliers.title')} />
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="workspace-page stock-page">
          <div className="workspace-header">
            <h1>{t('suppliers.title')}</h1>
            {hasCreatePermission && (
              <div className="workspace-actions stock-primary-actions">
                <IonButton onClick={() => setShowModal(true)}>
                  <IonIcon slot="start" icon={add} />
                  {t('suppliers.addSupplier')}
                </IonButton>
              </div>
            )}
          </div>
          <div className="stock-toolbar">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={t('suppliers.searchSuppliers')} />
          </div>

          {isLoading && allSuppliers.length === 0 ? (
            <div className="workspace-state"><IonSpinner /></div>
          ) : isError && allSuppliers.length === 0 ? (
            <div className="workspace-state" role="alert">
              <p>{t('suppliers.loadError')}</p>
              <Button onClick={() => refetch()}>{t('common.retry')}</Button>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="workspace-state">
              <p>{searchTerm ? t('suppliers.noSuppliersFound') : t('suppliers.noSuppliers')}</p>
            </div>
          ) : (
            <>
              <div className="stock-card-grid">
              {filteredSuppliers.map((supplier) => (
                <article key={supplier.id} className="workspace-record stock-card">
                  <IonItemSliding>
                    <IonItem button onClick={() => history.push(`/suppliers/${supplier.id}/ledger`)}>
                      <IonLabel>
                        <h2>{supplier.name}</h2>
                        <p>{supplier.phone}</p>
                        {supplier.email && <p>{supplier.email}</p>}
                        {supplier.balance !== 0 && (
                          <p className={supplier.balance > 0 ? 'stock-warning' : undefined}>
                            {supplier.balance > 0
                              ? `${t('suppliers.amountOwed')}: ${formatCurrency(supplier.balance)}`
                              : `${t('suppliers.advance')}: ${formatCurrency(Math.abs(supplier.balance))}`}
                          </p>
                        )}
                      </IonLabel>
                    </IonItem>
                    {hasUpdatePermission && (
                      <IonItemOptions side="end">
                        {supplier.balance > 0 && (
                          <IonItemOption color="success" onClick={() => handleMakePayment(supplier)} aria-label={t('suppliers.makePayment')}>
                            <IonIcon slot="icon-only" icon={cash} />
                          </IonItemOption>
                        )}
                        <IonItemOption color="primary" onClick={() => handleEditSupplier(supplier)} aria-label={t('common.edit')}>
                          <IonIcon slot="icon-only" icon={pencil} />
                        </IonItemOption>
                      </IonItemOptions>
                    )}
                  </IonItemSliding>
                  <div className="stock-card-bottom stock-supplier-actions">
                    <IonButton fill="clear" onClick={() => history.push(`/suppliers/${supplier.id}/ledger`)}>
                      {t('suppliers.viewLedger')}
                    </IonButton>
                    {hasUpdatePermission && (
                      <div className="workspace-actions">
                        {supplier.balance > 0 && (
                          <IonButton fill="outline" onClick={() => handleMakePayment(supplier)}>
                            {t('suppliers.makePayment')}
                          </IonButton>
                        )}
                        <IonButton fill="outline" onClick={() => handleEditSupplier(supplier)}>
                          {t('common.edit')}
                        </IonButton>
                      </div>
                    )}
                  </div>
                </article>
              ))}
              </div>

              <IonInfiniteScroll threshold="50%" onIonInfinite={loadMore} disabled={!hasMore}>
              <IonInfiniteScrollContent loadingText={t('suppliers.loadingMore')} />
              </IonInfiniteScroll>
            </>
          )}
        </div>

        {/* Add Supplier FAB */}
        {hasCreatePermission && <IonFab vertical="bottom" horizontal="end" slot="fixed" className="stock-fab">
          <IonFabButton aria-label={t('suppliers.addSupplier')}
            onClick={() => setShowModal(true)}
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>}

        {/* Add/Edit Supplier Modal */}
        {showModal && (
          <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>
                  {editingSupplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}
                </IonTitle>
                <IonButtons slot="end">
                  <IonButton
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              <Input 
                label={t('suppliers.supplierName')} 
                value={name} 
                onChange={setName} 
                required 
              />
              <Input
                label={t('suppliers.supplierPhone')}
                value={phone}
                onChange={setPhone}
                type="tel"
                required
              />
              <Input
                label={t('suppliers.supplierEmail')}
                value={email}
                onChange={setEmail}
                type="email"
              />
              <Input 
                label={t('suppliers.supplierAddress')} 
                value={address} 
                onChange={setAddress} 
              />
              <Button
                onClick={handleCreateSupplier}
                loading={creating || updating}
                fullWidth
                size="large"
              >
                {t('common.save')}
              </Button>
            </IonContent>
          </IonModal>
        )}

        {/* Payment Modal */}
        {showPaymentModal && paymentSupplier && (
          <IonModal isOpen={true} onDidDismiss={() => {
            setShowPaymentModal(false);
            resetPaymentForm();
          }}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>{t('suppliers.makePayment')}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => {
                    setShowPaymentModal(false);
                    resetPaymentForm();
                  }}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--ion-color-light)', borderRadius: '8px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>{paymentSupplier.name}</h2>
                <p style={{ margin: '0', fontSize: '14px', color: 'var(--ion-color-medium)' }}>{paymentSupplier.phone}</p>
                <p style={{ margin: '8px 0 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--ion-color-danger)' }}>
                  <span>{t('suppliers.outstandingBalance')}</span>: {formatCurrency(paymentSupplier.balance)}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label={t('suppliers.amountLabel')}
                    value={paymentAmount}
                    onChange={setPaymentAmount}
                    type="number"
                    placeholder="0.00"
                    required
                  />
                </div>
                {paymentSupplier.balance > 0 && (
                  <IonButton
                    onClick={() => setPaymentAmount(paymentSupplier.balance.toString())}
                    style={{ marginBottom: '0' }}
                  >
                    {t('suppliers.ledger.payFull')}
                  </IonButton>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('common.labels.paymentMode')}
                </label>
                <IonSelect
                  value={paymentMode}
                  onIonChange={(e) => setPaymentMode(e.detail.value)}
                  interface="popover"
                  style={{ 
                    border: '1px solid var(--ion-color-medium)',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                >
                  <IonSelectOption value="CASH">{t('common.paymentModes.cash')}</IonSelectOption>
                  <IonSelectOption value="UPI">{t('common.paymentModes.upi')}</IonSelectOption>
                  <IonSelectOption value="CARD">{t('common.paymentModes.card')}</IonSelectOption>
                  <IonSelectOption value="BANK">{t('common.paymentModes.bankTransfer')}</IonSelectOption>
                </IonSelect>
              </div>

              <Input
                label={t('suppliers.notesOptional')}
                value={paymentNotes}
                onChange={setPaymentNotes}
                placeholder={t('suppliers.addPaymentNotes')}
              />

              <Button
                onClick={handleSubmitPayment}
                loading={processingPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                fullWidth
                size="large"
              >
                {t('suppliers.ledger.recordPayment')}
              </Button>
            </IonContent>
          </IonModal>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SuppliersPage;
