import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonBadge,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonButton,
  RefresherEventDetail,
  IonGrid,
  IonRow,
  IonCol,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { cash, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useParams, useHistory } from 'react-router';
import { Navbar } from '@components/Navbar';

import {
  useGetSupplierByIdQuery,
  useGetSupplierLedgerQuery,
  useMakeSupplierPaymentMutation,
} from '../../core/api/supplierApi';
import { Input, Button, EmptyState } from '../../components';
import { formatCurrency, formatDateTime } from '@utils/helpers';
import { useAppSelector } from '../../core/hooks';
import { selectCurrentUser } from '../../core/auth/authSlice';
import { hasPermission } from '../../core/permissions/permissions';
import notificationService from '@core/services/notificationService';
import './SupplierLedgerPage.css';

const SupplierLedgerPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();  const history = useHistory();  const user = useAppSelector(selectCurrentUser);
  const userRoles = user?.roles || [];
  const hasUpdatePermission = hasPermission(userRoles, 'SUPPLIER_UPDATE');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Payment form state
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [notes, setNotes] = useState('');

  const { data: supplierData, isLoading: loadingSupplier } = useGetSupplierByIdQuery(id!);
  const { data: ledgerData, isLoading: loadingLedger, refetch } = useGetSupplierLedgerQuery({ id: id!, page: 1, limit: 50 });
  const [makePayment, { isLoading: processingPayment }] = useMakeSupplierPaymentMutation();

  const supplier = supplierData?.data;
  const entries = ledgerData?.data?.entries || [];
  const balance = ledgerData?.data?.balance || 0;

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await refetch();
    event.detail.complete();
  };
  const handlePurchaseClick = (entry: any) => {
    if (entry.ref_type === 'PURCHASE' && entry.ref_id) {
      history.push(`/purchases/${entry.ref_id}`);
    }
  };
  const handleMakePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      notificationService.warning(t('suppliers.enterValidAmount'));
      return;
    }

    try {
      await makePayment({
        id: id!,
        amount: parseFloat(amount),
        payment_mode: paymentMode as 'CASH' | 'UPI' | 'CARD' | 'BANK',
        description: notes.trim() || undefined,
      }).unwrap();

      // Reset form
      setAmount('');
      setPaymentMode('CASH');
      setNotes('');
      setShowPaymentModal(false);
      notificationService.success(t('suppliers.paymentRecordedSuccess'));
      refetch();
    } catch (error) {
      notificationService.handleApiError(error);
    }
  };

  if (loadingSupplier || loadingLedger) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/suppliers" />
            </IonButtons>
            <IonTitle>{t('suppliers.ledger.title')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="ion-text-center ion-padding">
            <IonSpinner />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!supplier) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/suppliers" />
            </IonButtons>
            <IonTitle>{t('suppliers.ledger.title')}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <EmptyState message={t('suppliers.ledger.supplierNotFound')} />
        </IonContent>
      </IonPage>
    );
  }

  // Separate credit and debit entries
  // For suppliers: credit = money we owe them (purchases), debit = payments we make
  const creditEntries = entries.filter(entry => entry.credit > 0);
  const debitEntries = entries.filter(entry => entry.debit > 0);

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'OPENING':
        return 'medium';
      case 'PURCHASE':
        return 'danger';
      case 'PAYMENT':
        return 'success';
      default:
        return 'medium';
    }
  };

  const getEntryTypeLabel = (type: string) => {
    switch (type) {
      case 'OPENING':
        return 'Opening Balance';
      case 'PURCHASE':
        return 'Purchase';
      case 'PAYMENT':
        return 'Payment';
      default:
        return type;
    }
  };

  return (
    <IonPage>
      <Navbar title={t('suppliers.ledger.title')} />
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Supplier Info Card */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{supplier.name}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div style={{ marginBottom: '12px' }}>
              <strong>{t('suppliers.ledger.phone')}</strong> {supplier.phone}
            </div>
            {supplier.email && (
              <div style={{ marginBottom: '12px' }}>
                <strong>{t('suppliers.ledger.email')}</strong> {supplier.email}
              </div>
            )}
            {supplier.address && (
              <div style={{ marginBottom: '12px' }}>
                <strong>{t('suppliers.ledger.address')}</strong> {supplier.address}
              </div>
            )}

            {/* Balance Summary */}
            <div className="ledger-summary">
              <IonGrid>
                <IonRow>
                  <IonCol size="12">
                    <div className="summary-item">
                      <div className="summary-label">{t('suppliers.ledger.currentBalance')}</div>
                      <div className={`summary-value balance ${balance > 0 ? 'credit' : 'debit'}`}>
                        {formatCurrency(Math.abs(balance))}
                        {balance > 0 ? ` ${t('suppliers.ledger.payable')}` : balance < 0 ? ` ${t('suppliers.ledger.advance')}` : ''}
                      </div>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>
          </IonCardContent>
        </IonCard>

        {entries.length === 0 ? (
          <EmptyState message={t('suppliers.ledger.noTransactions')} />
        ) : (
          <IonGrid>
            <IonRow>
              {/* Credit Column (Purchases - Money We Owe) */}
              <IonCol size="12" sizeMd="6">
                <IonCard className="ledger-card credit-card">
                  <IonCardHeader>
                    <IonCardTitle>
                      {t('suppliers.ledger.creditPurchases')}
                      <IonBadge color="danger" style={{ marginLeft: '8px' }}>
                        {creditEntries.length}
                      </IonBadge>
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {creditEntries.length === 0 ? (
                      <EmptyState message={t('suppliers.ledger.noPurchaseEntries')} />
                    ) : (
                      <IonList>
                        {creditEntries.map((entry) => (
                          <IonItem 
                            key={entry.id} 
                            className="ledger-item"
                            button={entry.ref_type === 'PURCHASE' && !!entry.ref_id}
                            onClick={() => handlePurchaseClick(entry)}
                          >
                            <IonLabel>
                              <div className="entry-header">
                                <IonBadge color={getEntryTypeColor(entry.ref_type)} mode="ios">
                                  {getEntryTypeLabel(entry.ref_type)}
                                </IonBadge>
                                <span className="entry-date">{formatDateTime(entry.created_at)}</span>
                              </div>
                              {entry.ref_id && (
                                <p className="entry-reference" style={{ color: 'var(--ion-color-primary)', fontWeight: '500' }}>
                                  {entry.ref_type === 'PURCHASE' ? '📦 Purchase #' : 'Ref: #'}{entry.ref_id}
                                </p>
                              )}
                            </IonLabel>
                            <div slot="end" className="entry-amount credit-amount">
                              {formatCurrency(entry.credit)}
                            </div>
                          </IonItem>
                        ))}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>

              {/* Debit Column (Payments Made) */}
              <IonCol size="12" sizeMd="6">
                <IonCard className="ledger-card debit-card">
                  <IonCardHeader>
                    <IonCardTitle>
                      {t('suppliers.ledger.debitPayments')}
                      <IonBadge color="success" style={{ marginLeft: '8px' }}>
                        {debitEntries.length}
                      </IonBadge>
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {debitEntries.length === 0 ? (
                      <EmptyState message={t('suppliers.ledger.noPaymentEntries')} />
                    ) : (
                      <IonList>
                        {debitEntries.map((entry) => (
                          <IonItem key={entry.id} className="ledger-item">
                            <IonLabel>
                              <div className="entry-header">
                                <IonBadge color={getEntryTypeColor(entry.ref_type)} mode="ios">
                                  {getEntryTypeLabel(entry.ref_type)}
                                </IonBadge>
                                <span className="entry-date">{formatDateTime(entry.created_at)}</span>
                              </div>
                              {entry.payment_mode && (
                                <p className="entry-reference" style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem' }}>
                                  💳 {entry.payment_mode}
                                </p>
                              )}
                              {entry.description && (
                                <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                  {entry.description}
                                </p>
                              )}
                            </IonLabel>
                            <div slot="end" className="entry-amount debit-amount">
                              {formatCurrency(entry.debit)}
                            </div>
                          </IonItem>
                        ))}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        )}

        {/* Make Payment FAB */}
        {hasUpdatePermission && balance > 0 && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={() => setShowPaymentModal(true)}>
              <IonIcon icon={cash} />
            </IonFabButton>
          </IonFab>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <IonModal isOpen={true} onDidDismiss={() => setShowPaymentModal(false)}>
            <IonHeader>
              <IonToolbar>
                <IonTitle>{t('suppliers.ledger.makePayment')}</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowPaymentModal(false)}>
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              <IonCard>
                <IonCardContent>
                  <h2 style={{ margin: '0 0 8px', color: 'var(--ion-color-danger)' }}>
                    Outstanding Balance: {formatCurrency(balance)}
                  </h2>
                </IonCardContent>
              </IonCard>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label={t('suppliers.ledger.amount')}
                    value={amount}
                    onChange={setAmount}
                    type="number"
                    placeholder="0.00"
                    required
                  />
                </div>
                {balance > 0 && (
                  <IonButton
                    onClick={() => setAmount(balance.toString())}
                    style={{ marginBottom: '0' }}
                  >
                    {t('suppliers.ledger.payFull')}
                  </IonButton>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('suppliers.ledger.paymentMode')}
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
                  <IonSelectOption value="CASH">{t('suppliers.ledger.cash')}</IonSelectOption>
                  <IonSelectOption value="UPI">{t('suppliers.ledger.upi')}</IonSelectOption>
                  <IonSelectOption value="CARD">{t('suppliers.ledger.card')}</IonSelectOption>
                  <IonSelectOption value="BANK_TRANSFER">{t('suppliers.ledger.bankTransfer')}</IonSelectOption>
                </IonSelect>
              </div>

              <Input
                label={t('suppliers.ledger.notesOptional')}
                value={notes}
                onChange={setNotes}
                placeholder={t('suppliers.ledger.addPaymentNotes')}
              />

              <Button
                onClick={handleMakePayment}
                loading={processingPayment}
                disabled={!amount || parseFloat(amount) <= 0}
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

export default SupplierLedgerPage;
