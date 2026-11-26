import { focusFirstEditable } from '@components/keyboardNavigation';
import { hasPermission } from '@core/permissions/permissions';
import { useAppSelector } from '@core/hooks';
import { selectCurrentUser } from '@core/auth/authSlice';
import { LazyQuickPartyCreate as QuickPartyCreate } from '@components/LazyQuickCreate';
import { useDeviceWriteAccess } from '@core/commercial/useDeviceWriteAccess';
import { createIdempotentAttempt } from '@utils/idempotentAttempt';
import React, { useState, useMemo, useRef } from 'react';
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
import { useLazySearchCustomersQuery } from '@core/api/customerApi';
import { useLazyGetPendingInvoicesByCustomerQuery } from '@core/api/invoiceApi';
import { Input, Select, Button, EmptyState, SearchBar } from '@components';
import { formatCurrency } from '@utils/helpers';
import { PAYMENT_MODES } from '@core/constants';
import type { Customer, PaymentMode } from '@core/types';
import { useDebouncedValue } from '@hooks/useDebouncedValue';
import { filterCustomers } from '@utils/localSearch';
import './PaymentsPage.css';

export const PaymentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const deviceWrite = useDeviceWriteAccess('PAYMENTS');
  const customerDeviceWrite = useDeviceWriteAccess('CUSTOMERS_KHATA');
  const currentUser = useAppSelector(selectCurrentUser);
  const customerWrite =
    customerDeviceWrite && hasPermission(currentUser?.roles ?? [], 'CUSTOMER_CREATE');
  const { data, isLoading, isError, refetch } = useGetPaymentsQuery({});
  const [
    searchCustomers,
    { data: customersData, isLoading: customersLoading, isFetching: customersFetching },
  ] = useLazySearchCustomersQuery();
  const [createPayment, { isLoading: creating }] = useCreatePaymentMutation();

  const [showModal, setShowModal] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNote, setReferenceNote] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [quickCustomer, setQuickCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebouncedValue(customerSearch.trim(), 300);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const paymentAttempt = useRef(createIdempotentAttempt());
  const paymentModalRef = useRef<HTMLIonModalElement | null>(null);
  const customerSearchReady =
    debouncedCustomerSearch.length >= 2 || (customerSearch.length > 0 && !customerSearch.trim());

  const [getPendingInvoices, { data: pendingInvoicesData, isLoading: loadingInvoices }] =
    useLazyGetPendingInvoicesByCustomerQuery();

  React.useEffect(() => {
    if (!showModal || !customerSearchReady) return;
    void searchCustomers(debouncedCustomerSearch, true);
  }, [customerSearchReady, debouncedCustomerSearch, searchCustomers, showModal]);

  React.useEffect(() => {
    if (!showModal || !selectedCustomer) return;
    const frame = requestAnimationFrame(() => {
      const field = paymentModalRef.current?.querySelector?.<HTMLIonInputElement>('ion-input');
      void field?.setFocus?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [showModal, selectedCustomer]);

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
      const selectedInvoice = pendingInvoicesData.data.find((inv) => inv.id === invoiceId);
      if (selectedInvoice) {
        const balanceAmount =
          (selectedInvoice.total_amount || 0) - (selectedInvoice.paid_amount || 0);
        setAmount(balanceAmount.toString());
      }
    }
  }, [invoiceId, pendingInvoicesData]);

  const handleCreatePayment = async () => {
    if (!deviceWrite) return;
    // Validation
    if (!customerId) {
      setErrorMessage(t('payments.selectCustomerError'));
      setShowError(true);
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setErrorMessage(t('payments.invalidAmount'));
      setShowError(true);
      return;
    }

    const request = paymentAttempt.current.begin({
      customer_id: customerId,
      invoice_id: invoiceId || undefined,
      amount: Number(amount),
      payment_mode: paymentMode as PaymentMode,
      reference_note: referenceNote || undefined,
    });
    if (!request) return;
    let succeeded = false;
    try {
      await createPayment(request).unwrap();
      succeeded = true;

      try {
        await paymentModalRef.current?.dismiss();
      } catch {
        // The controlled isOpen state remains the fallback if Ionic has already dismissed it.
      }
      setShowModal(false);
      setShowSuccess(true);
    } catch (err) {
      const error = err as { status?: number; data?: { message?: string }; message?: string };
      const errMsg = error?.data?.message || error?.message || t('payments.saveError');
      setErrorMessage(errMsg);
      setShowError(true);
    } finally {
      paymentAttempt.current.finish(succeeded);
    }
  };

  const resetForm = () => {
    setQuickCustomer(false);
    setHighlight(0);
    setCustomerId('');
    setSelectedCustomer(null);
    setInvoiceId('');
    setAmount('');
    setPaymentMode('CASH');
    setReferenceNote('');
    setCustomerSearch('');
  };

  const payments = useMemo(() => data?.data || [], [data?.data]);
  const paymentModeLabels: Record<string, string> = {
    CASH: t('payments.cash'),
    UPI: t('payments.upi'),
    CARD: t('payments.card'),
    CHEQUE: t('payments.cheque'),
    BANK: t('payments.bankTransfer'),
    ADJUSTMENT: t('payments.adjustment'),
  };
  const matchingCustomers = useMemo(() => {
    if (!customerSearchReady) return [];
    return filterCustomers(customersData?.data || [], customerSearch).slice(0, 20);
  }, [customerSearch, customerSearchReady, customersData?.data]);

  const filteredPayments = useMemo(() => {
    const term = paymentSearch.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((payment) =>
      [
        payment.customer?.name,
        payment.payment_mode,
        payment.amount,
        payment.reference_note,
        String(payment.created_at).slice(0, 10),
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(term)
      )
    );
  }, [payments, paymentSearch]);

  // Group payments by date
  const groupedPayments = useMemo(() => {
    const groups: { [key: string]: typeof payments } = {};
    filteredPayments.forEach((payment) => {
      const date = new Date(payment.created_at).toLocaleDateString(i18n?.language || 'en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(payment);
    });
    return groups;
  }, [filteredPayments, i18n?.language]);

  return (
    <IonPage>
      <Navbar title={t('payments.title')} />
      <IonContent>
        <div className="workspace-page">
          <div className="workspace-header">
            <div>
              <h1>{t('payments.title')}</h1>
              <p>{t('payments.pageHint')}</p>
            </div>
            <div className="workspace-actions payments-desktop-action">
              <Button onClick={() => setShowModal(true)}>
                <IonIcon icon={add} className="mr-2" />
                {t('payments.recordPayment')}
              </Button>
            </div>
          </div>
          <SearchBar
            value={paymentSearch}
            onChange={setPaymentSearch}
            placeholder={t('payments.searchPayments')}
          />
          {isLoading ? (
            <div className="workspace-state" role="status" aria-live="polite">
              <p>{t('common.loading')}</p>
            </div>
          ) : isError && payments.length === 0 ? (
            <div className="workspace-state">
              <p>{t('payments.loadError')}</p>
              <Button onClick={() => refetch()} variant="outline">
                {t('common.retry')}
              </Button>
            </div>
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              message={t('payments.noPayments')}
              action={
                <Button onClick={() => setShowModal(true)}>
                  <IonIcon icon={add} className="mr-2" />
                  {t('payments.recordPayment')}
                </Button>
              }
            />
          ) : (
            <>
              {isError && (
                <div className="payments-stale-warning" role="status">
                  <span>{t('payments.refreshWarning')}</span>
                  <Button onClick={() => refetch()} variant="outline">
                    {t('common.retry')}
                  </Button>
                </div>
              )}
              <IonList className="payments-list">
                {Object.entries(groupedPayments).map(([date, datePayments]) => (
                  <IonItemGroup key={date} className="payments-day">
                    <IonItemDivider color="light" sticky>
                      <IonLabel>
                        <h2 style={{ fontWeight: '600' }}>{date}</h2>
                      </IonLabel>
                    </IonItemDivider>
                    <div className="workspace-grid payments-grid">
                      {datePayments.map((payment) => (
                        <IonItem key={payment.id} className="workspace-record payment-record">
                          <IonLabel>
                            <div className="payment-record-body">
                              <div>
                                <h2>{payment.customer?.name || t('common.customer')}</h2>
                                <p>
                                  {new Date(payment.created_at).toLocaleString(
                                    i18n?.language || 'en-IN',
                                    {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    }
                                  )}
                                </p>
                                <p>
                                  {paymentModeLabels[payment.payment_mode] || payment.payment_mode}
                                </p>
                              </div>
                              <strong>{formatCurrency(payment.amount)}</strong>
                            </div>
                          </IonLabel>
                        </IonItem>
                      ))}
                    </div>
                  </IonItemGroup>
                ))}
              </IonList>
            </>
          )}
        </div>

        {/* FAB Button */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="payments-mobile-action">
          <IonFabButton
            onClick={() => {
              setShowModal(true);
            }}
            aria-label={t('payments.recordPayment')}
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Record Payment Modal */}
        <IonModal
          onDidPresent={(event) => focusFirstEditable(event.target as HTMLElement)}
          ref={paymentModalRef}
          isOpen={showModal}
          onDidDismiss={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          {/* Modal content must not register as another page in the Payments route stack. */}
          <div className="ion-page">
            <IonHeader>
              <IonToolbar>
                <IonTitle>{t('payments.recordPayment')}</IonTitle>
                <IonButtons slot="end">
                  <IonButton
                    onClick={() => {
                      setShowModal(false);
                    }}
                  >
                    <IonIcon icon={close} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              {selectedCustomer ? (
                <div className="payment-customer-selected">
                  <div>
                    <strong>{selectedCustomer.name}</strong>
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerId('');
                      setCustomerSearch('');
                    }}
                  >
                    {t('billing.changeCustomer')}
                  </IonButton>
                </div>
              ) : (
                <>
                  <Input
                    label={t('payments.searchCustomers')}
                    value={customerSearch}
                    onChange={(value) => {
                      setCustomerSearch(value);
                      setHighlight(0);
                    }}
                    onKeyDown={(event) => {
                      if (event.nativeEvent.isComposing) return;
                      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        if (!customerSearch) setCustomerSearch(' ');
                        setHighlight((index) =>
                          Math.max(
                            0,
                            Math.min(
                              matchingCustomers.length - 1,
                              index + (event.key === 'ArrowDown' ? 1 : -1)
                            )
                          )
                        );
                      }
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        const customer = matchingCustomers[highlight];
                        if (customer && !customersFetching && !customersLoading) {
                          setSelectedCustomer(customer);
                          setCustomerId(customer.id);
                          setCustomerSearch('');
                        }
                      }
                    }}
                    placeholder={t('payments.searchCustomers')}
                  />
                  {customerSearch.trim().length > 0 && !customerSearchReady && (
                    <p className="form-note">{t('payments.customerSearchMinimum')}</p>
                  )}
                  {customerSearchReady && (customersLoading || customersFetching) && (
                    <p className="form-note">{t('common.loading')}</p>
                  )}
                  {customerSearchReady &&
                    !customersLoading &&
                    !customersFetching &&
                    matchingCustomers.length === 0 && (
                      <p className="form-note">{t('payments.noCustomersFound')}</p>
                    )}
                  <button
                    type="button"
                    className="min-h-touch"
                    disabled={!customerWrite}
                    onClick={() => setQuickCustomer(true)}
                  >
                    {t('customers.addCustomer')}
                  </button>
                  {quickCustomer && customerWrite && (
                    <QuickPartyCreate
                      kind="customer"
                      onCreated={(customer) => {
                        setSelectedCustomer(customer);
                        setCustomerId(customer.id);
                        setCustomerSearch('');
                        setQuickCustomer(false);
                      }}
                    />
                  )}
                  {customerSearchReady && matchingCustomers.length > 0 && (
                    <div
                      className="payment-customer-results"
                      role="listbox"
                      aria-label={t('payments.searchCustomers')}
                    >
                      {matchingCustomers.map((customer, index) => (
                        <button
                          key={customer.id}
                          type="button"
                          role="option"
                          aria-selected={index === highlight}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerId(customer.id);
                            setCustomerSearch('');
                          }}
                        >
                          <strong>{customer.name}</strong>
                          <span>{customer.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {customerId && loadingInvoices && (
                <div className="text-center py-2 text-sm">{t('payments.loadingInvoices')}</div>
              )}
              {customerId &&
                !loadingInvoices &&
                pendingInvoicesData?.data &&
                pendingInvoicesData.data.length === 0 && (
                  <p className="form-note">{t('foundation.payments.noPendingInvoices')}</p>
                )}
              {customerId && pendingInvoicesData?.data && pendingInvoicesData.data.length > 0 && (
                <>
                  <Select
                    label={t('payments.selectInvoice')}
                    value={invoiceId}
                    onChange={setInvoiceId}
                    options={[
                      { value: '', label: t('payments.generalPayment') },
                      ...pendingInvoicesData.data.map((inv) => ({
                        value: inv.id,
                        label: `${inv.invoice_number} - ${formatCurrency((inv.total_amount || 0) - (inv.paid_amount || 0))} (${inv.status})`,
                      })),
                    ]}
                    placeholder={t('common.placeholders.selectInvoice')}
                  />
                  {!invoiceId && <p className="form-note">{t('payments.oldestFirstHint')}</p>}
                </>
              )}
              <Input
                label={t('common.amount')}
                value={amount}
                onChange={setAmount}
                type="number"
                required
                placeholder={invoiceId ? t('payments.amountAutoFilled') : t('payments.enterAmount')}
              />
              <Select
                label={t('payments.paymentMode')}
                value={paymentMode}
                onChange={setPaymentMode}
                options={PAYMENT_MODES.map((m) => ({
                  value: m.value,
                  label: paymentModeLabels[m.value] || m.label,
                }))}
                required
              />
              <Input
                label={t('payments.referenceNote')}
                value={referenceNote}
                onChange={setReferenceNote}
              />
              <Button
                onClick={() => {
                  handleCreatePayment();
                }}
                disabled={!deviceWrite}
                loading={creating}
                fullWidth
                size="large"
              >
                {t('common.save')}
              </Button>
            </IonContent>
          </div>
        </IonModal>

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
