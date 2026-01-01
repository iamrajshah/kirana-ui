import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
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

const SuppliersPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const hasCreatePermission = hasPermission(userRoles, 'SUPPLIER_CREATE');
  const hasUpdatePermission = hasPermission(userRoles, 'SUPPLIER_UPDATE');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const limit = 50;
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  const { data, isLoading, isFetching, refetch } = useGetSuppliersQuery({ page, limit });
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
          const existingIds = new Set(prev.map((s: any) => s.id));
          const newSuppliers = data.data.filter((s: any) => !existingIds.has(s.id));
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

  const handleEditSupplier = (supplier: any) => {
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

  const handleMakePayment = () => {
    if (!paymentSupplier) return;
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      notificationService.warning('Please enter a valid amount');
      return;
    }

    try {
      await makePayment({
        id: paymentSupplier.id,
        amount: parseFloat(paymentAmount),
        payment_mode: paymentMode as 'CASH' | 'UPI' | 'CARD' | 'BANK',
        description: paymentNotes.trim() || undefined,
      }).unwrap();

      notificationService.success('Payment recorded successfully');
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
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('suppliers.searchSuppliers')}
        />

        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading && allSuppliers.length === 0 ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="ion-text-center ion-padding">
            <IonText color="medium">
              <p>{searchTerm ? t('suppliers.noSuppliersFound') : t('suppliers.noSuppliers')}</p>
            </IonText>
          </div>
        ) : (
          <>
            <IonList>
              {filteredSuppliers.map((supplier) => (
                <IonItemSliding key={supplier.id}>
                  <IonItem
                    button
                    onClick={() => history.push(`/suppliers/${supplier.id}/ledger`)}
                  >
                    <IonLabel>
                      <h2 className="font-semibold text-lg">{supplier.name}</h2>
                      <p className="text-gray-600">{supplier.phone}</p>
                      {supplier.email && <p className="text-gray-500">{supplier.email}</p>}
                      {supplier.balance !== 0 && (
                        <p
                          className="font-medium"
                          style={{
                            color:
                              supplier.balance > 0
                                ? 'var(--ion-color-danger)'
                                : 'var(--ion-color-success)',
                          }}
                        >
                          {supplier.balance > 0
                            ? `${t('suppliers.amountOwed')}: ${formatCurrency(supplier.balance)}`
                            : `${t('suppliers.advance')}: ${formatCurrency(Math.abs(supplier.balance))}`}
                        </p>
                      )}
                    </IonLabel>
                  </IonItem>
                  <IonItemOptions side="end">
                    {supplier.balance > 0 && (
                      <IonItemOption 
                        color="success" 
                        onClick={() => {
                          setPaymentSupplier(supplier);
                          handleMakePayment();
                        }}
                        disabled={!hasUpdatePermission}
                      >
                        <IonIcon slot="icon-only" icon={cash} />
                      </IonItemOption>
                    )}
                    <IonItemOption 
                      color="primary" 
                      onClick={() => handleEditSupplier(supplier)}
                      disabled={!hasUpdatePermission}
                    >
                      <IonIcon slot="icon-only" icon={pencil} />
                    </IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              ))}
            </IonList>

            <IonInfiniteScroll threshold="50%" onIonInfinite={loadMore} disabled={!hasMore}>
              <IonInfiniteScrollContent loadingText="Loading more suppliers..." />
            </IonInfiniteScroll>
          </>
        )}

        {/* Add Supplier FAB */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton 
            onClick={() => setShowModal(true)}
            disabled={!hasCreatePermission}
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

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
                <IonTitle>Make Payment</IonTitle>
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
                  Outstanding: {formatCurrency(paymentSupplier.balance)}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="Amount"
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
                    Pay Full
                  </IonButton>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Payment Mode
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
                  <IonSelectOption value="CASH">Cash</IonSelectOption>
                  <IonSelectOption value="UPI">UPI</IonSelectOption>
                  <IonSelectOption value="CARD">Card</IonSelectOption>
                  <IonSelectOption value="BANK">Bank Transfer</IonSelectOption>
                </IonSelect>
              </div>

              <Input
                label="Notes (Optional)"
                value={paymentNotes}
                onChange={setPaymentNotes}
                placeholder="Add payment notes..."
              />

              <Button
                onClick={handleSubmitPayment}
                loading={processingPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                fullWidth
                size="large"
              >
                Record Payment
              </Button>
            </IonContent>
          </IonModal>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SuppliersPage;
