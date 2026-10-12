import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
} from '@ionic/react';
import { add, bookmark, card, cash, personAdd, remove, scan, trash } from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loading, SearchBar } from '@components';
import { PaymentModal } from '@components/PaymentModal';
import { Navbar } from '@components/Navbar';
import {
  useCreateInvoiceMutation,
  useCancelInvoiceMutation,
  useFinalizeInvoiceMutation,
  useGetInvoiceByIdQuery,
  useUpdateInvoiceMutation,
} from '@core/api/invoiceApi';
import { useCreatePaymentMutation } from '@core/api/paymentApi';
import { useLazySearchCustomersQuery } from '@core/api/customerApi';
import { useLazySearchVariantsQuery, type BillingSearchVariant } from '@core/api/productApi';
import notificationService, { apiErrorMessage } from '@core/services/notificationService';
import { ROUTES } from '@core/constants';
import type { Customer, PaymentMode } from '@core/types';
import { formatCurrency, generateIdempotencyKey } from '@utils/helpers';
import type { BillingCartItem } from './billing.logic';
import { buildInvoiceItems, calculateBillingTotals } from './billing.logic';

export const BillingPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const editInvoiceId = new URLSearchParams(location.search).get('edit');

  const [searchVariants, { data: variantsData, isLoading: searchLoading }] =
    useLazySearchVariantsQuery();
  const [searchCustomers, { data: customersData, isLoading: customersLoading }] =
    useLazySearchCustomersQuery();
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [cancelInvoice, { isLoading: cancelling }] = useCancelInvoiceMutation();
  const [updateInvoice, { isLoading: updating }] = useUpdateInvoiceMutation();
  const [finalizeInvoice, { isLoading: finalizing }] = useFinalizeInvoiceMutation();
  const [createPayment, { isLoading: paying }] = useCreatePaymentMutation();
  const { data: invoiceData, isLoading: invoiceLoading } = useGetInvoiceByIdQuery(
    editInvoiceId || '',
    { skip: !editInvoiceId }
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [cartItems, setCartItems] = useState<BillingCartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Pick<
    Customer,
    'id' | 'name' | 'phone'
  > | null>(null);
  const initializedInvoiceId = useRef<string | null>(null);
  const [gstAmount, setGstAmount] = useState(0);
  const [billDiscount, setBillDiscount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const invoiceIdempotencyKey = useRef(generateIdempotencyKey());
  const paymentIdempotencyKey = useRef(generateIdempotencyKey());

  const customerId = selectedCustomer?.id || '';
  const totals = useMemo(
    () => calculateBillingTotals(cartItems, billDiscount, 'amount', gstAmount),
    [billDiscount, cartItems, gstAmount]
  );
  const isBusy = creating || updating || finalizing || paying || cancelling;

  useEffect(() => {
    if (
      !editInvoiceId ||
      !invoiceData?.data ||
      invoiceLoading ||
      initializedInvoiceId.current === editInvoiceId
    )
      return;

    const invoice = invoiceData.data;
    initializedInvoiceId.current = editInvoiceId;
    const attachedCustomer = invoice.customer;
    if (attachedCustomer) {
      setSelectedCustomer({
        id: attachedCustomer.id.toString(),
        name: attachedCustomer.name,
        phone: attachedCustomer.phone,
      });
    }
    setGstAmount(Number(invoice.gst_amount) || 0);
    setBillDiscount(Number(invoice.discount_amount) || 0);
    setCartItems(
      (invoice.items || []).map((item) => ({
        variant_id: item.variant_id?.toString() || '',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        discount_amount: Number(item.discount_amount) || 0,
        discount_type: 'amount',
        product_name: item.variant?.product?.name || t('billing.unknownProduct'),
        sku: item.variant?.sku || '',
      }))
    );
  }, [editInvoiceId, invoiceData, invoiceLoading, t]);

  useEffect(() => {
    if (searchTerm.length < 2) return;
    const timer = window.setTimeout(() => searchVariants({ search: searchTerm }), 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm, searchVariants]);

  useEffect(() => {
    if (customerSearchTerm.length < 2) return;
    const timer = window.setTimeout(() => searchCustomers(customerSearchTerm), 250);
    return () => window.clearTimeout(timer);
  }, [customerSearchTerm, searchCustomers]);

  const addToCart = (value: BillingSearchVariant) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.variant_id === value.id);
      if (existing) {
        return current.map((item) =>
          item.variant_id === value.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      const sellingPrice = Number(value.price || 0);
      return [
        ...current,
        {
          variant_id: value.id,
          quantity: 1,
          unit_price: sellingPrice,
          discount_amount: 0,
          discount_type: 'amount',
          product_name: value.product_name || t('billing.unknownProduct'),
          sku: value.sku || '',
        },
      ];
    });
    setSearchTerm('');
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.variant_id === variantId);
      if (!existing) return current;
      if (quantity <= 0) return current.filter((item) => item.variant_id !== variantId);
      if (existing.quantity === quantity) return current;
      return current.map((item) => (item.variant_id === variantId ? { ...item, quantity } : item));
    });
  };

  const updatePrice = (variantId: string, price: number) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.variant_id === variantId);
      if (!existing || existing.unit_price === price) return current;
      return current.map((item) =>
        item.variant_id === variantId ? { ...item, unit_price: price } : item
      );
    });
  };

  const resetForm = () => {
    setCartItems([]);
    setGstAmount(0);
    setBillDiscount(0);
    setSearchTerm('');
    setCustomerSearchTerm('');
    setShowCustomerSearch(false);
    setSelectedCustomer(null);
    setShowPaymentModal(false);
    setPendingInvoiceId(null);
    invoiceIdempotencyKey.current = generateIdempotencyKey();
    paymentIdempotencyKey.current = generateIdempotencyKey();
  };

  const invoicePayload = (status: 'DRAFT' | 'FINALIZED') => ({
    ...(customerId ? { customer_id: customerId } : {}),
    items: buildInvoiceItems(cartItems),
    gst_amount: Number(gstAmount),
    discount_amount: totals.billDiscountAmount,
    status,
    idempotency_key: invoiceIdempotencyKey.current,
  });

  const buildUpdateInvoicePayload = () => ({
    customer_id: customerId || null,
    items: buildInvoiceItems(cartItems),
    gst_amount: Number(gstAmount),
    discount_amount: totals.billDiscountAmount,
  });

  const recordPayment = async (
    invoiceId: string,
    amount: number,
    mode: PaymentMode,
    reference?: string
  ) => {
    await createPayment({
      ...(customerId ? { customer_id: customerId } : {}),
      invoice_id: invoiceId,
      amount,
      payment_mode: mode,
      reference_note: reference,
      idempotency_key: paymentIdempotencyKey.current,
    }).unwrap();
  };

  const completePayment = () => {
    notificationService.success(t('billing.paymentRecordedSuccessfully'));
    resetForm();
    history.replace(ROUTES.BILLING);
  };

  const handleSaveAsDraft = async () => {
    if (!cartItems.length) {
      notificationService.error(t('billing.pleaseAddProducts'));
      return;
    }
    try {
      if (editInvoiceId) {
        await updateInvoice({
          id: editInvoiceId,
          data: buildUpdateInvoicePayload(),
        }).unwrap();
      } else {
        await createInvoice(invoicePayload('DRAFT')).unwrap();
      }
      notificationService.success(t('billing.draftSaved'));
      resetForm();
      history.replace(ROUTES.BILLING);
    } catch (error: unknown) {
      notificationService.error(apiErrorMessage(error, t('billing.failedToSaveDraft'), true));
    }
  };

  const createFinalInvoice = async () => {
    if (editInvoiceId) {
      await updateInvoice({
        id: editInvoiceId,
        data: buildUpdateInvoicePayload(),
      }).unwrap();
      await finalizeInvoice(editInvoiceId).unwrap();
      return editInvoiceId;
    }
    const result = await createInvoice(invoicePayload('FINALIZED')).unwrap();
    if (!result.data?.id) throw new Error(t('billing.missingInvoice'));
    return result.data.id;
  };

  const handleCheckout = async (quickMode?: PaymentMode) => {
    if (!cartItems.length) {
      notificationService.error(t('billing.pleaseAddProducts'));
      return;
    }
    let invoiceId: string | null = null;
    try {
      invoiceId = await createFinalInvoice();
      if (quickMode) {
        try {
          await recordPayment(invoiceId, totals.total, quickMode);
          completePayment();
          return;
        } catch (paymentError) {
          setPendingInvoiceId(invoiceId);
          setShowPaymentModal(true);
          throw paymentError;
        }
      }
      setPendingInvoiceId(invoiceId);
      setShowPaymentModal(true);
    } catch (error: unknown) {
      notificationService.error(apiErrorMessage(error, t('billing.failedToCreateInvoice'), true));
    }
  };

  const cancelPendingCheckout = async () => {
    const invoiceId = pendingInvoiceId;
    if (!invoiceId) return;

    try {
      await cancelInvoice({ id: invoiceId, reason: t('billing.paymentNotCompleted') }).unwrap();
      setShowPaymentModal(false);
      setPendingInvoiceId(null);
      invoiceIdempotencyKey.current = generateIdempotencyKey();
      paymentIdempotencyKey.current = generateIdempotencyKey();
      if (editInvoiceId) history.replace(ROUTES.BILLING);
      notificationService.success(t('billing.checkoutCancelled'));
    } catch (error: unknown) {
      notificationService.error(apiErrorMessage(error, t('billing.failedToCancelCheckout'), true));
    }
  };

  const handleModalPayment = async (amount: number, mode: PaymentMode, reference?: string) => {
    if (!pendingInvoiceId) {
      notificationService.error(t('billing.missingInvoice'));
      return;
    }
    try {
      await recordPayment(pendingInvoiceId, amount, mode, reference);
      completePayment();
    } catch (error: unknown) {
      notificationService.error(apiErrorMessage(error, t('billing.paymentFailed'), true));
      throw error;
    }
  };

  return (
    <IonPage>
      <Navbar title={editInvoiceId ? t('billing.editDraftInvoice') : t('billing.fastBilling')} />
      <IonContent>
        {invoiceLoading && <Loading isOpen message={t('billing.loadingInvoice')} />}
        {isBusy && <Loading isOpen message={t('billing.processingBill')} />}

        <main className="mx-auto max-w-7xl px-3 pb-44 pt-3 sm:px-5 lg:pb-8">
          <section className="billing-customer-banner mb-3 rounded-2xl border border-sky-100 p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  {t('billing.saleFor')}
                </p>
                <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                  {selectedCustomer
                    ? `${selectedCustomer.name} (${selectedCustomer.phone})`
                    : t('billing.walkInCustomer')}
                </h1>
                <p className="text-xs text-gray-600">
                  {customerId ? t('billing.customerCreditAvailable') : t('billing.walkInHint')}
                </p>
              </div>
              <IonButton
                fill={customerId ? 'outline' : 'solid'}
                onClick={() => setShowCustomerSearch((value) => !value)}
                className="min-h-touch"
              >
                <IonIcon icon={personAdd} slot="start" />
                {customerId ? t('billing.changeCustomer') : t('billing.attachCustomer')}
              </IonButton>
            </div>

            {showCustomerSearch && (
              <div className="mt-3 rounded-xl bg-white p-2 shadow-sm">
                <SearchBar
                  value={customerSearchTerm}
                  onChange={setCustomerSearchTerm}
                  placeholder={t('billing.searchCustomerPlaceholder')}
                />
                {customersLoading && (
                  <p className="p-2 text-sm text-gray-500">{t('common.loading')}</p>
                )}
                {customersData?.data && customerSearchTerm && (
                  <IonList className="max-h-52 overflow-auto">
                    {customersData.data.map((customer) => (
                      <IonItem
                        key={customer.id}
                        button
                        detail
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearchTerm('');
                          setShowCustomerSearch(false);
                        }}
                        style={{ '--min-height': '52px' }}
                      >
                        <IonLabel>
                          <h3 className="font-semibold">{customer.name}</h3>
                          <p>{customer.phone}</p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
                {customerId && (
                  <IonButton
                    fill="clear"
                    color="danger"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setShowCustomerSearch(false);
                    }}
                  >
                    {t('billing.useWalkInInstead')}
                  </IonButton>
                )}
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <section className="min-w-0">
              <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:p-3">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchBar
                      value={searchTerm}
                      onChange={setSearchTerm}
                      placeholder={t('billing.searchProductPlaceholder')}
                    />
                  </div>
                  <IonButton
                    fill="outline"
                    aria-label={t('billing.scanBarcode')}
                    className="min-w-touch"
                  >
                    <IonIcon icon={scan} slot="icon-only" />
                  </IonButton>
                </div>
                {searchLoading && (
                  <p className="p-3 text-center text-sm text-gray-500">{t('common.loading')}</p>
                )}
                {searchTerm && variantsData?.data && (
                  <IonList className="max-h-64 overflow-auto">
                    {variantsData.data.map((variant) => (
                      <IonItem
                        key={variant.id}
                        button
                        onClick={() => addToCart(variant)}
                        style={{ '--min-height': '56px' }}
                      >
                        <IonLabel>
                          <h3 className="font-semibold">{variant.product_name}</h3>
                          <p>{variant.sku}</p>
                        </IonLabel>
                        <strong className="mr-2">{formatCurrency(variant.price)}</strong>
                        <IonIcon icon={add} slot="end" color="primary" />
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">
                  {t('billing.cartItems')}{' '}
                  <span className="text-sky-600">({cartItems.length})</span>
                </h2>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    className="min-h-touch px-3 text-sm font-semibold text-red-600"
                    onClick={() => setCartItems([])}
                  >
                    {t('billing.clearCart')}
                  </button>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="mt-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center">
                  <IonIcon icon={scan} className="mb-2 text-4xl text-sky-500" />
                  <p className="font-semibold text-gray-800">{t('billing.emptyCart')}</p>
                  <p className="mt-1 text-sm text-gray-500">{t('billing.emptyCartHint')}</p>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {cartItems.map((item) => (
                    <IonCard key={item.variant_id} className="m-0 rounded-2xl shadow-sm">
                      <IonCardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-bold text-gray-900 sm:text-base">
                              {item.product_name}
                            </h3>
                            <p className="text-xs text-gray-500">{item.sku}</p>
                          </div>
                          <strong className="text-base text-sky-700">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </strong>
                          <button
                            type="button"
                            aria-label={t('billing.removeFromCart')}
                            className="flex min-h-touch min-w-touch items-center justify-center rounded-xl text-red-600"
                            onClick={() => updateQuantity(item.variant_id, 0)}
                          >
                            <IonIcon icon={trash} />
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-600">
                              {t('billing.qty')}
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-gray-300 bg-white"
                                onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                              >
                                <IonIcon icon={remove} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                className="min-h-touch w-20 rounded-xl border border-gray-300 px-2 text-center text-base font-bold"
                                onChange={(event) =>
                                  updateQuantity(
                                    item.variant_id,
                                    Math.max(1, Number(event.target.value) || 1)
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-gray-300 bg-white"
                                onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                              >
                                <IonIcon icon={add} />
                              </button>
                            </div>
                          </div>
                          <label className="block text-xs font-semibold text-gray-600">
                            {t('billing.priceLabel')}
                            <div className="mt-1 flex min-h-touch items-center rounded-xl border border-gray-300 px-3">
                              <span className="mr-1">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                className="w-full border-0 bg-transparent text-base font-semibold outline-none"
                                onChange={(event) =>
                                  updatePrice(item.variant_id, Number(event.target.value) || 0)
                                }
                              />
                            </div>
                          </label>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  ))}
                </div>
              )}
            </section>

            <aside className="lg:sticky lg:top-3 lg:self-start">
              <IonCard className="m-0 rounded-2xl shadow-md">
                <IonCardContent className="p-4">
                  <h2 className="text-lg font-bold text-gray-900">{t('billing.billSummary')}</h2>
                  <div className="mt-3 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('billing.subtotal')}</span>
                      <strong>{formatCurrency(totals.subtotal)}</strong>
                    </div>
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-600">{t('billing.billDiscount')}</span>
                      <div className="flex min-h-touch w-36 items-center rounded-xl border border-gray-300 px-3">
                        <span className="mr-1">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={billDiscount}
                          className="w-full border-0 bg-transparent text-right font-semibold outline-none"
                          onChange={(event) => setBillDiscount(Number(event.target.value) || 0)}
                        />
                      </div>
                    </label>
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-600">{t('billing.gstAmount')}</span>
                      <div className="flex min-h-touch w-36 items-center rounded-xl border border-gray-300 px-3">
                        <span className="mr-1">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={gstAmount}
                          className="w-full border-0 bg-transparent text-right font-semibold outline-none"
                          onChange={(event) => setGstAmount(Number(event.target.value) || 0)}
                        />
                      </div>
                    </label>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-end justify-between">
                        <span className="font-bold text-gray-900">
                          {t('billing.amountToCollect')}
                        </span>
                        <strong className="text-2xl text-sky-700">
                          {formatCurrency(totals.total)}
                        </strong>
                      </div>
                      {!customerId && (
                        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                          {t('billing.walkInFullPaymentOnly')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <IonButton
                      color="success"
                      className="min-h-touch"
                      disabled={!cartItems.length || isBusy}
                      onClick={() => handleCheckout('CASH')}
                    >
                      <IonIcon icon={cash} slot="start" />
                      {t('billing.payCash')}
                    </IonButton>
                    <IonButton
                      color="primary"
                      className="min-h-touch"
                      disabled={!cartItems.length || isBusy}
                      onClick={() => handleCheckout('UPI')}
                    >
                      UPI
                    </IonButton>
                    <IonButton
                      fill="outline"
                      className="min-h-touch"
                      disabled={!cartItems.length || isBusy}
                      onClick={() => handleCheckout()}
                    >
                      <IonIcon icon={card} slot="start" />
                      {t('billing.otherPayment')}
                    </IonButton>
                    <IonButton
                      fill="clear"
                      className="min-h-touch"
                      disabled={!cartItems.length || isBusy}
                      onClick={handleSaveAsDraft}
                    >
                      <IonIcon icon={bookmark} slot="start" />
                      {editInvoiceId ? t('billing.update') : t('billing.holdBill')}
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            </aside>
          </div>
        </main>

        {cartItems.length > 0 && (
          <div className="fixed inset-x-0 bottom-14 z-20 border-t border-gray-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{t('billing.amountToCollect')}</p>
                <p className="truncate text-xl font-black text-sky-700">
                  {formatCurrency(totals.total)}
                </p>
              </div>
              <IonButton color="success" disabled={isBusy} onClick={() => handleCheckout('CASH')}>
                {t('billing.cash')}
              </IonButton>
              <IonButton disabled={isBusy} onClick={() => handleCheckout('UPI')}>
                UPI
              </IonButton>
              <IonButton fill="outline" disabled={isBusy} onClick={() => handleCheckout()}>
                <IonIcon icon={card} slot="icon-only" />
              </IonButton>
            </div>
          </div>
        )}

        {pendingInvoiceId && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={cancelPendingCheckout}
            onPayment={handleModalPayment}
            invoiceAmount={totals.total}
            paidAmount={0}
            isLoading={paying}
            allowPartial={Boolean(customerId)}
          />
        )}
      </IonContent>
    </IonPage>
  );
};
