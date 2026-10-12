import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonBadge,
  IonToast,
} from '@ionic/react';
import { cash } from 'ionicons/icons';
import { Navbar } from '@components/Navbar';
import { Select, Input } from '@components';
import { useGetCustomersQuery } from '@core/api/customerApi';
import { useLazyGetPendingInvoicesByCustomerQuery } from '@core/api/invoiceApi';
import { useCreatePaymentMutation } from '@core/api/paymentApi';
import { formatCurrency, formatDateTime, generateIdempotencyKey } from '@utils/helpers';
import type { PaymentMode, Invoice } from '@core/types';
import { useTranslation } from 'react-i18next';

interface InvoiceAllocation {
  invoice_id: string;
  invoice_number: string;
  total_amount: number;
  balance_amount: number;
  allocated_amount: number;
}

export const PaymentPage: React.FC = () => {
   const { t } = useTranslation();
  const { data: customersData } = useGetCustomersQuery({ skip: 0, take: 1000 });
  const [getPendingInvoices, { data: pendingInvoicesData, isLoading: loadingInvoices }] =
    useLazyGetPendingInvoicesByCustomerQuery();
  const [createPayment, { isLoading: creating }] = useCreatePaymentMutation();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [totalPaymentAmount, setTotalPaymentAmount] = useState('');
  const [reference, setReference] = useState('');
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const customers = customersData?.data?.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.phone})`,
  })) || [];

  const paymentModeOptions = [
    { value: 'CASH' as PaymentMode, label: t('payment.cash') },
    { value: 'UPI' as PaymentMode, label: t('payment.upi') },
    { value: 'CARD' as PaymentMode, label: t('payment.card') },
    { value: 'BANK' as PaymentMode, label: t('payment.bankTransfer') },
  ];

  // Load pending invoices when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      getPendingInvoices(selectedCustomerId);
      setAllocations([]);
      setTotalPaymentAmount('');
    }
  }, [selectedCustomerId, getPendingInvoices]);

  const handleSelectInvoice = (invoice: Invoice, selected: boolean) => {
    if (selected) {
      // Add invoice to allocations
      setAllocations((prev) => [
        ...prev,
        {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount || 0,
          balance_amount: invoice.balance_amount || 0,
          allocated_amount: invoice.balance_amount || 0,
        },
      ]);
    } else {
      // Remove invoice from allocations
      setAllocations((prev) => prev.filter((a) => a.invoice_id !== invoice.id));
    }
  };

  const handleAllocationChange = (invoice_id: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    setAllocations((prev) =>
      prev.map((a) =>
        a.invoice_id === invoice_id ? { ...a, allocated_amount: numAmount } : a
      )
    );
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
  };

  const handleAutoAllocate = () => {
    const paymentAmount = parseFloat(totalPaymentAmount) || 0;
    if (paymentAmount <= 0 || allocations.length === 0) return;

    let remainingAmount = paymentAmount;
    const updatedAllocations = allocations.map((allocation) => {
      if (remainingAmount <= 0) {
        return { ...allocation, allocated_amount: 0 };
      }

      const amountToAllocate = Math.min(remainingAmount, allocation.balance_amount);
      remainingAmount -= amountToAllocate;
      return { ...allocation, allocated_amount: amountToAllocate };
    });

    setAllocations(updatedAllocations);
  };

  const handleSubmitPayment = async () => {
    const paymentAmount = parseFloat(totalPaymentAmount) || 0;

    if (!selectedCustomerId) {
      setToastMessage(t('payments.selectCustomerError'));
      setShowErrorToast(true);
      return;
    }

    if (paymentAmount <= 0) {
      setToastMessage(t('payments.invalidAmount'));
      setShowErrorToast(true);
      return;
    }

    const totalAllocated = getTotalAllocated();
    if (totalAllocated > paymentAmount) {
      setToastMessage(t('foundation.payments.allocationExceedsPayment'));
      setShowErrorToast(true);
      return;
    }

    try {
      const payload: {
        customer_id: string;
        amount: number;
        payment_mode: PaymentMode;
        reference_note?: string;
        idempotency_key: string;
        invoice_allocations?: Array<{ invoice_id: string; amount: number }>;
      } = {
        customer_id: selectedCustomerId,
        amount: paymentAmount,
        payment_mode: paymentMode,
        reference_note: reference || undefined,
        idempotency_key: generateIdempotencyKey(),
      };

      // Add invoice allocations if any
      if (allocations.length > 0) {
        payload.invoice_allocations = allocations.map((a) => ({
          invoice_id: a.invoice_id,
          amount: a.allocated_amount,
        }));
      }

      await createPayment(payload).unwrap();

      setToastMessage(t('payments.paymentRecorded'));
      setShowSuccessToast(true);

      // Reset form
      setSelectedCustomerId('');
      setTotalPaymentAmount('');
      setReference('');
      setAllocations([]);
      setPaymentMode('CASH');
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      setToastMessage(err?.data?.message || t('payments.saveError'));
      setShowErrorToast(true);
    }
  };

  const pendingInvoices = pendingInvoicesData?.data || [];
  const selectedInvoiceIds = new Set(allocations.map((a) => a.invoice_id));

  return (
    <IonPage>
      <Navbar title={t('payments.recordPayment')} />
      <IonContent className="ion-padding">
        <div className="max-w-4xl mx-auto">
          {/* Customer Selection */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{t('payments.customerSelection')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <Select
                label={`${t('payments.selectCustomerLabel')} *`}
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                options={customers}
                placeholder={t('common.placeholders.chooseCustomer')}
                required
              />
            </IonCardContent>
          </IonCard>

          {/* Pending Invoices */}
          {selectedCustomerId && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  {t('payments.pendingInvoices')} ({pendingInvoices.length})
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {loadingInvoices ? (
                  <p className="text-center text-gray-500">{t('payments.loadingInvoices')}</p>
                ) : pendingInvoices.length === 0 ? (
                  <p className="text-center text-gray-500">
                    {t('foundation.payments.noPendingInvoices')}
                  </p>
                ) : (
                  <IonList>
                    {pendingInvoices.map((invoice: Invoice) => (
                      <IonItem key={invoice.id}>
                        <IonCheckbox
                          slot="start"
                          checked={selectedInvoiceIds.has(invoice.id)}
                          onIonChange={(e) =>
                            handleSelectInvoice(invoice, e.detail.checked)
                          }
                        />
                        <IonLabel>
                          <h3>{invoice.invoice_number}</h3>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(invoice.created_at)}
                          </p>
                          <p className="text-sm mt-1">
                            {t('foundation.payments.balance')} {formatCurrency(invoice.balance_amount || 0)}
                          </p>
                        </IonLabel>
                        <IonBadge
                          slot="end"
                          color={invoice.status === 'UNPAID' ? 'danger' : 'warning'}
                        >
                          {invoice.status}
                        </IonBadge>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCardContent>
            </IonCard>
          )}

          {/* Payment Details */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{t('payments.paymentDetails')}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="space-y-3">
                <Input
                  label={`${t('payments.totalPaymentAmountLabel')} *`}
                  type="number"
                  value={totalPaymentAmount}
                  onChange={setTotalPaymentAmount}
                  placeholder="0.00"
                  required
                />

                <Select
                  label={`${t('payments.paymentModeLabel')} *`}
                  value={paymentMode}
                  onChange={(val) => setPaymentMode(val as PaymentMode)}
                  options={paymentModeOptions}
                />

                {(paymentMode === 'UPI' ||
                  paymentMode === 'CARD' ||
                  paymentMode === 'BANK') && (
                  <Input
                    label={t('payments.referenceNumberLabel')}
                    value={reference}
                    onChange={setReference}
                    placeholder={
                      paymentMode === 'UPI'
                        ? t('payment.upiTransactionId')
                        : paymentMode === 'CARD'
                        ? t('payment.last4DigitsOrApproval')
                        : t('payment.bankReferenceNumber')
                    }
                  />
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Invoice Allocation */}
          {allocations.length > 0 && (
            <IonCard>
              <IonCardHeader>
                <div className="flex justify-between items-center">
                  <IonCardTitle>{t('payments.allocatePayment')}</IonCardTitle>
                  <IonButton size="small" fill="outline" onClick={handleAutoAllocate}>
                    {t('payments.autoAllocate')}
                  </IonButton>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <div className="space-y-3">
                  {allocations.map((allocation) => (
                    <div
                      key={allocation.invoice_id}
                      className="p-3 border rounded"
                      style={{ borderColor: '#ddd' }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">
                          {allocation.invoice_number}
                        </span>
                        <span className="text-xs text-gray-500">
                          {t('foundation.payments.balance')} {formatCurrency(allocation.balance_amount)}
                        </span>
                      </div>
                      <Input
                        label={t('payments.allocatedAmountLabel')}
                        type="number"
                        value={allocation.allocated_amount.toString()}
                        onChange={(val) =>
                          handleAllocationChange(allocation.invoice_id, val)
                        }
                        placeholder="0.00"
                      />
                    </div>
                  ))}

                  <div className="border-t pt-3 mt-3" style={{ borderColor: '#ddd' }}>
                    <div className="flex justify-between font-semibold">
                      <span>{t('foundation.payments.totalAllocated')}</span>
                      <span>{formatCurrency(getTotalAllocated())}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1 text-gray-600">
                      <span>{t('foundation.payments.paymentAmount')}</span>
                      <span>{formatCurrency(parseFloat(totalPaymentAmount) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1 font-medium" style={{ color: getTotalAllocated() > (parseFloat(totalPaymentAmount) || 0) ? '#eb445a' : '#2dd36f' }}>
                      <span>{t('foundation.payments.remaining')}</span>
                      <span>
                        {formatCurrency(
                          (parseFloat(totalPaymentAmount) || 0) - getTotalAllocated()
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Submit Button */}
          <div className="mt-4 pb-4">
            <IonButton
              expand="block"
              onClick={handleSubmitPayment}
              disabled={creating || !selectedCustomerId || !totalPaymentAmount}
              color="success"
            >
              <IonIcon icon={cash} slot="start" />
              {t('payments.recordPayment')}
            </IonButton>
          </div>
        </div>

        {/* Success Toast */}
        <IonToast
          isOpen={showSuccessToast}
          onDidDismiss={() => setShowSuccessToast(false)}
          message={toastMessage}
          duration={2000}
          color="success"
          position="top"
        />

        {/* Error Toast */}
        <IonToast
          isOpen={showErrorToast}
          onDidDismiss={() => setShowErrorToast(false)}
          message={toastMessage}
          duration={3000}
          color="danger"
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};
