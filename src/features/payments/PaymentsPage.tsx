import React, { useState, useMemo } from 'react';
import { Navbar } from '@components/Navbar';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
  IonButtons,
  IonButton,
  IonToast,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItemDivider,
  IonItemGroup,
} from '@ionic/react';
import { add, close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useGetPaymentsQuery, useCreatePaymentMutation } from '@core/api/paymentApi';
import { useGetCustomersQuery } from '@core/api/customerApi';
import { useLazyGetPendingInvoicesByCustomerQuery } from '@core/api/invoiceApi';
import { Input, Select, Button, EmptyState, Loading } from '@components';
import { formatCurrency, formatDateTime, generateIdempotencyKey } from '@utils/helpers';
import { PAYMENT_MODES } from '@core/constants';
import type { PaymentMode } from '@core/types';

export const PaymentsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useGetPaymentsQuery({});
  const { data: customersData } = useGetCustomersQuery({ take: 1000 });
  const [createPayment, { isLoading: creating }] = useCreatePaymentMutation();

  const [showModal, setShowModal] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNote, setReferenceNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [getPendingInvoices, { data: pendingInvoicesData, isLoading: loadingInvoices }] = useLazyGetPendingInvoicesByCustomerQuery();

  // Load pending invoices when customer is selected
  React.useEffect(() => {
    if (customerId) {
      getPendingInvoices(customerId);
    } else {
      setInvoiceId('');
      setAmount('');
    }
  }, [customerId, getPendingInvoices]);

  // Auto-fill amount when invoice is selected
  React.useEffect(() => {
    if (invoiceId && pendingInvoicesData?.data) {
      const selectedInvoice = pendingInvoicesData.data.find(inv => inv.id === invoiceId);
      if (selectedInvoice) {
        const balanceAmount = (selectedInvoice.total_amount || 0) - (selectedInvoice.paid_amount || 0);
        setAmount(balanceAmount.toString());
      }
    }
  }, [invoiceId, pendingInvoicesData]);

  const handleCreatePayment = async () => {
    // Validation
    if (!customerId) {
      setErrorMessage('Please select a customer');
      setShowError(true);
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      setShowError(true);
      return;
    }

    try {
      console.log('💰 Creating payment:', {
        customer_id: customerId,
        amount: Number(amount),
        payment_mode: paymentMode,
        reference_note: referenceNote || undefined,
      });

      const result = await createPayment({
        customer_id: customerId,
        invoice_id: invoiceId || undefined,
        amount: Number(amount),
        payment_mode: paymentMode as PaymentMode,
        reference_note: referenceNote || undefined,
        idempotency_key: generateIdempotencyKey(),
      }).unwrap();

      console.log('✅ Payment created:', result);

      setShowSuccess(true);
      setShowModal(false);
      resetForm();
      refetch();
    } catch (err) {
      const error = err as { status?: number; data?: { message?: string }; message?: string };
      console.error('❌ Failed to create payment:', error);
      console.error('Error details:', {
        status: error?.status,
        data: error?.data,
        message: error?.message,
      });
      const errMsg = error?.data?.message || error?.message || 'Failed to record payment';
      setErrorMessage(errMsg);
      setShowError(true);
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setInvoiceId('');
    setAmount('');
    setPaymentMode('CASH');
    setReferenceNote('');
  };

  const payments = useMemo(() => data?.data || [], [data?.data]);
  const customers =
    customersData?.data?.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` })) ||
    [];

  // Group payments by date
  const groupedPayments = useMemo(() => {
    const groups: { [key: string]: typeof payments } = {};
    payments.forEach((payment) => {
      const date = new Date(payment.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(payment);
    });
    return groups;
  }, [payments]);

  return (
    <IonPage>
      <Navbar title={t('payments.title')} />
      <IonContent>
        <div className="p-4">
          {isLoading ? (
            <Loading isOpen={isLoading} />
          ) : payments.length === 0 ? (
            <EmptyState
              message="No payments recorded yet"
              action={
                <Button onClick={() => setShowModal(true)}>
                  <IonIcon icon={add} className="mr-2" />
                  {t('payments.recordPayment')}
                </Button>
              }
            />
          ) : (
            <IonList>
              {Object.entries(groupedPayments).map(([date, datePayments]) => (
                <IonItemGroup key={date}>
                  <IonItemDivider color="light" sticky>
                    <IonLabel>
                      <h2 style={{ fontWeight: '600' }}>{date}</h2>
                    </IonLabel>
                  </IonItemDivider>
                  {datePayments.map((payment) => (
                    <IonItem key={payment.id}>
                      <IonLabel>
                        <h2 className="font-semibold">{payment.customer?.name}</h2>
                        <p className="text-gray-600">{formatDateTime(payment.created_at)}</p>
                        <p className="text-sm">{payment.payment_mode}</p>
                      </IonLabel>
                      <div slot="end" className="text-right">
                        <div className="font-bold text-success text-lg">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>
                    </IonItem>
                  ))}
                </IonItemGroup>
              ))}
            </IonList>
          )}
        </div>

        {/* FAB Button */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => {
            console.log('💰 FAB button clicked - Record Payment');
            setShowModal(true);
          }}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Record Payment Modal */}
        {showModal && (
          <IonModal 
            isOpen={true}
            onDidDismiss={() => {
              console.log('🚪 Payment modal dismissed');
              setShowModal(false);
            }}
          >
            <IonPage>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>{t('payments.recordPayment')}</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => {
                      console.log('❌ Close button clicked');
                      setShowModal(false);
                    }}>
                      <IonIcon icon={close} />
                    </IonButton>
                  </IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent className="ion-padding">
            <Select
              label={t('billing.selectCustomer')}
              value={customerId}
              onChange={setCustomerId}
              options={customers}
              placeholder={t('billing.selectCustomer')}
              required
            />
            {customerId && loadingInvoices && (
              <div className="text-center py-2 text-sm">Loading invoices...</div>
            )}
            {customerId && pendingInvoicesData?.data && pendingInvoicesData.data.length > 0 && (
              <Select
                label="Select Invoice (Optional)"
                value={invoiceId}
                onChange={setInvoiceId}
                options={[
                  { value: '', label: 'General Payment (No Invoice)' },
                  ...pendingInvoicesData.data.map(inv => ({
                    value: inv.id,
                    label: `${inv.invoice_number} - ${formatCurrency((inv.total_amount || 0) - (inv.paid_amount || 0))} (${inv.status})`
                  }))
                ]}
                placeholder="Select an invoice"
              />
            )}
            <Input
              label={t('common.amount')}
              value={amount}
              onChange={setAmount}
              type="number"
              required
              placeholder={invoiceId ? "Amount auto-filled, edit for partial payment" : "Enter amount"}
            />
            <Select
              label={t('payments.paymentMode')}
              value={paymentMode}
              onChange={setPaymentMode}
              options={PAYMENT_MODES.map((m) => ({ value: m.value, label: m.label }))}
              required
            />
            <Input
              label={t('payments.referenceNote')}
              value={referenceNote}
              onChange={setReferenceNote}
            />
            <Button onClick={() => {
              console.log('💾 Save payment button clicked');
              handleCreatePayment();
            }} loading={creating} fullWidth size="large">
              {t('common.save')}
            </Button>
          </IonContent>
        </IonPage>
        </IonModal>
        )}

        <IonToast
          isOpen={showSuccess}
          onDidDismiss={() => setShowSuccess(false)}
          message={t('payments.paymentRecorded')}
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
