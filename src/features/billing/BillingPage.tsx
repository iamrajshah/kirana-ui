import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
} from '@ionic/react';
import { add, bookmark, card, cash, personAdd, remove, scan, trash } from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarcodeScannerComponent, Loading, SearchBar } from '@components';
import { PaymentModal } from '@components/PaymentModal';
import { Navbar } from '@components/Navbar';
import {
  useCreateInvoiceMutation,
  useCancelInvoiceMutation,
  useFinalizeInvoiceMutation,
  useGetHeldBillsQuery,
  useGetInvoiceByIdQuery,
  useRenewHeldBillMutation,
  useUpdateInvoiceMutation,
} from '@core/api/invoiceApi';
import { useCreatePaymentMutation } from '@core/api/paymentApi';
import { useLazySearchCustomersQuery } from '@core/api/customerApi';
import {
  useLazyScanBarcodeQuery,
  useLazySearchVariantsQuery,
  type BillingSearchVariant,
} from '@core/api/productApi';
import notificationService, { apiErrorMessage } from '@core/services/notificationService';
import { ROUTES } from '@core/constants';
import { selectCurrentUser } from '@core/auth/authSlice';
import { useAppSelector } from '@core/hooks';
import type { Customer, HeldBill, PaymentMode } from '@core/types';
import { formatCurrency, generateIdempotencyKey } from '@utils/helpers';
import type { BillingCartItem } from './billing.logic';
import { buildInvoiceItems, calculateBillingTotals } from './billing.logic';
import { HeldBillsPanel } from './HeldBillsPanel';

const COUNTER_LABEL_STORAGE_KEY = 'kirana_counter_label';

const isConflictError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'status' in error && error.status === 409;

export const BillingPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const currentUser = useAppSelector(selectCurrentUser);
  const query = new URLSearchParams(location.search);
  const editInvoiceId = query.get('edit');
  const focusedHeldBillId = query.get('held');

  const [searchVariants, { data: variantsData, isLoading: searchLoading }] =
    useLazySearchVariantsQuery();
  const [scanBarcode, { isFetching: barcodeLoading }] = useLazyScanBarcodeQuery();
  const [searchCustomers, { data: customersData, isLoading: customersLoading }] =
    useLazySearchCustomersQuery();
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [cancelInvoice, { isLoading: cancelling }] = useCancelInvoiceMutation();
  const [updateInvoice, { isLoading: updating }] = useUpdateInvoiceMutation();
  const [finalizeInvoice, { isLoading: finalizing }] = useFinalizeInvoiceMutation();
  const [renewHeldBill] = useRenewHeldBillMutation();
  const [createPayment, { isLoading: paying }] = useCreatePaymentMutation();
  const {
    data: invoiceData,
    isLoading: invoiceLoading,
    refetch: refetchInvoice,
  } = useGetInvoiceByIdQuery(editInvoiceId || '', { skip: !editInvoiceId });
  const { data: heldBillsData } = useGetHeldBillsQuery({ take: 50 });

  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeTools, setShowBarcodeTools] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [cartItems, setCartItems] = useState<BillingCartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Pick<
    Customer,
    'id' | 'name' | 'phone'
  > | null>(null);
  const initializedInvoiceId = useRef<string | null>(null);
  const barcodeQueueRef = useRef<Array<{ barcode: string; billGeneration: number }>>([]);
  const barcodeProcessingRef = useRef(false);
  const barcodeWorkPendingRef = useRef(0);
  const billGenerationRef = useRef(0);
  const billingMountedRef = useRef(true);
  const heldRenewalPendingRef = useRef(false);
  const heldMutationPendingRef = useRef(false);
  const [pendingBarcodeCount, setPendingBarcodeCount] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [billDiscount, setBillDiscount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [showHeldBills, setShowHeldBills] = useState(Boolean(focusedHeldBillId));
  const [counterLabel, setCounterLabel] = useState<string | null>(() => {
    const stored = localStorage.getItem(COUNTER_LABEL_STORAGE_KEY)?.trim();
    return stored && stored.length <= 32 ? stored : null;
  });
  const [activeHeldVersion, setActiveHeldVersion] = useState<number | undefined>();
  const activeHeldVersionRef = useRef<number | undefined>();
  const [heldConflict, setHeldConflict] = useState(false);
  const loadedInvoiceSnapshotRef = useRef<string | null>(null);
  const heldBillsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const invoiceIdempotencyKey = useRef(generateIdempotencyKey());
  const paymentIdempotencyKey = useRef(generateIdempotencyKey());

  const customerId = selectedCustomer?.id || '';
  const totals = useMemo(
    () => calculateBillingTotals(cartItems, billDiscount, 'amount', gstAmount),
    [billDiscount, cartItems, gstAmount]
  );
  const barcodeWorkPending = pendingBarcodeCount > 0 || barcodeLoading;
  const isBusy = creating || updating || finalizing || paying || cancelling || barcodeWorkPending;
  const updateActiveHeldVersion = useCallback((version: number | undefined) => {
    activeHeldVersionRef.current = version;
    setActiveHeldVersion(version);
  }, []);

  useEffect(() => {
    billingMountedRef.current = true;
    return () => {
      billingMountedRef.current = false;
      billGenerationRef.current += 1;
      barcodeQueueRef.current = [];
    };
  }, []);

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
    setSelectedCustomer(
      attachedCustomer
        ? {
            id: attachedCustomer.id.toString(),
            name: attachedCustomer.name,
            phone: attachedCustomer.phone,
          }
        : null
    );
    const nextGstAmount = Number(invoice.gst_amount) || 0;
    const nextDiscount = Number(invoice.discount_amount) || 0;
    const nextCartItems: BillingCartItem[] = (invoice.items || []).map((item) => ({
      variant_id: item.variant_id?.toString() || '',
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      discount_amount: Number(item.discount_amount) || 0,
      discount_type: 'amount',
      product_name: item.variant?.product?.name || t('billing.unknownProduct'),
      sku: item.variant?.sku || '',
    }));
    setGstAmount(nextGstAmount);
    setBillDiscount(nextDiscount);
    setCartItems(nextCartItems);
    updateActiveHeldVersion(invoice.held_at ? invoice.version : undefined);
    setHeldConflict(false);
    loadedInvoiceSnapshotRef.current = JSON.stringify({
      customer_id: attachedCustomer?.id?.toString() || null,
      items: buildInvoiceItems(nextCartItems),
      gst_amount: nextGstAmount,
      discount_amount: calculateBillingTotals(nextCartItems, nextDiscount, 'amount', nextGstAmount)
        .billDiscountAmount,
    });
  }, [editInvoiceId, invoiceData, invoiceLoading, t, updateActiveHeldVersion]);

  useEffect(() => {
    const invoice = invoiceData?.data;
    if (
      !editInvoiceId ||
      !invoice?.held_at ||
      !currentUser ||
      invoice.held_by !== currentUser.id ||
      activeHeldVersion === undefined
    ) {
      return;
    }

    const renew = async () => {
      if (
        document.visibilityState !== 'visible' ||
        heldRenewalPendingRef.current ||
        heldMutationPendingRef.current
      )
        return;
      heldRenewalPendingRef.current = true;
      const renewalVersion = activeHeldVersion;
      try {
        await renewHeldBill({ id: editInvoiceId, expected_version: renewalVersion }).unwrap();
      } catch (error: unknown) {
        if (
          isConflictError(error) &&
          !heldMutationPendingRef.current &&
          activeHeldVersionRef.current === renewalVersion
        )
          setHeldConflict(true);
      } finally {
        heldRenewalPendingRef.current = false;
      }
    };
    const interval = window.setInterval(() => void renew(), 5 * 60 * 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void renew();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [activeHeldVersion, currentUser, editInvoiceId, invoiceData, renewHeldBill]);

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

  const addToCart = (
    value: Pick<BillingSearchVariant, 'id' | 'product_name' | 'price' | 'sku'>
  ) => {
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

  const processBarcodeQueue = async () => {
    if (barcodeProcessingRef.current) return;
    barcodeProcessingRef.current = true;

    while (barcodeQueueRef.current.length > 0) {
      const queuedBarcode = barcodeQueueRef.current.shift();
      if (!queuedBarcode) continue;

      try {
        const result = await scanBarcode(queuedBarcode.barcode).unwrap();
        const isCurrentBill =
          billingMountedRef.current && queuedBarcode.billGeneration === billGenerationRef.current;
        if (!isCurrentBill) continue;

        if (!result.found || !result.data) {
          notificationService.error(t('billing.barcodeNotFound'));
          continue;
        }

        const { product, variant } = result.data;
        if (product.is_active !== true || variant.is_active !== true) {
          notificationService.error(t('billing.barcodeUnavailable'));
          continue;
        }

        addToCart({
          id: variant.id,
          product_name: product.name,
          price: Number(variant.selling_price ?? variant.price ?? 0),
          sku: variant.sku || '',
        });
        setShowBarcodeTools(false);
        notificationService.success(t('billing.barcodeAdded'));
      } catch (error: unknown) {
        if (
          billingMountedRef.current &&
          queuedBarcode.billGeneration === billGenerationRef.current
        ) {
          notificationService.error(apiErrorMessage(error, t('billing.barcodeLookupFailed'), true));
        }
      } finally {
        barcodeWorkPendingRef.current = Math.max(0, barcodeWorkPendingRef.current - 1);
        if (billingMountedRef.current) {
          setPendingBarcodeCount(barcodeWorkPendingRef.current);
        }
      }
    }

    barcodeProcessingRef.current = false;
  };

  const addScannedBarcode = (rawBarcode: string) => {
    const barcode = rawBarcode.trim();
    if (!barcode) {
      notificationService.error(t('billing.enterBarcode'));
      return;
    }

    barcodeQueueRef.current.push({ barcode, billGeneration: billGenerationRef.current });
    barcodeWorkPendingRef.current += 1;
    setPendingBarcodeCount(barcodeWorkPendingRef.current);
    setBarcodeInput('');
    void processBarcodeQueue();
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
    billGenerationRef.current += 1;
    setCartItems([]);
    setGstAmount(0);
    setBillDiscount(0);
    setSearchTerm('');
    setBarcodeInput('');
    setShowBarcodeTools(false);
    setCustomerSearchTerm('');
    setShowCustomerSearch(false);
    setSelectedCustomer(null);
    setShowPaymentModal(false);
    setPendingInvoiceId(null);
    updateActiveHeldVersion(undefined);
    setHeldConflict(false);
    loadedInvoiceSnapshotRef.current = null;
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

  const updateInvoicePayload = useMemo(
    () => ({
      customer_id: customerId || null,
      items: buildInvoiceItems(cartItems),
      gst_amount: Number(gstAmount),
      discount_amount: totals.billDiscountAmount,
    }),
    [cartItems, customerId, gstAmount, totals.billDiscountAmount]
  );
  const currentInvoiceSnapshot = useMemo(
    () => JSON.stringify(updateInvoicePayload),
    [updateInvoicePayload]
  );
  const hasLocalHeldChanges = Boolean(
    editInvoiceId &&
    loadedInvoiceSnapshotRef.current &&
    loadedInvoiceSnapshotRef.current !== currentInvoiceSnapshot
  );

  const requestCounterLabel = (force = false) => {
    if (counterLabel && !force) return counterLabel;
    const entered = window.prompt(t('billing.heldBills.counterPrompt'), counterLabel || '');
    if (entered === null) return null;
    const nextLabel = entered.trim();
    if (!nextLabel || nextLabel.length > 32) {
      notificationService.error(t('billing.heldBills.counterInvalid'));
      return null;
    }
    localStorage.setItem(COUNTER_LABEL_STORAGE_KEY, nextLabel);
    setCounterLabel(nextLabel);
    return nextLabel;
  };

  const resumeHeldBill = (bill: HeldBill) => {
    updateActiveHeldVersion(bill.version);
    setHeldConflict(false);
    setShowHeldBills(false);
    history.replace(`${ROUTES.BILLING}?edit=${bill.id}`, { claimedVersion: bill.version });
  };

  const canResumeHeldBill = (bill: HeldBill) => {
    if (bill.id === editInvoiceId) return true;
    const wouldDiscardNewBill = !editInvoiceId && cartItems.length > 0;
    const wouldDiscardEditedHeldBill = Boolean(editInvoiceId && hasLocalHeldChanges);
    return (
      (!wouldDiscardNewBill && !wouldDiscardEditedHeldBill) ||
      window.confirm(t('billing.heldBills.switchUnsavedConfirm'))
    );
  };

  const handleReleasedHeldBill = (bill: HeldBill) => {
    if (bill.id !== editInvoiceId) return;
    resetForm();
    setShowHeldBills(false);
    history.replace(ROUTES.BILLING);
  };

  const closeHeldBills = () => {
    setShowHeldBills(false);
    if (focusedHeldBillId) history.replace(ROUTES.BILLING);
  };

  const reloadHeldBill = async () => {
    initializedInvoiceId.current = null;
    setHeldConflict(false);
    await refetchInvoice();
  };

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
    if (barcodeWorkPendingRef.current > 0) {
      notificationService.error(t('billing.barcodeInProgress'));
      return;
    }
    if (!cartItems.length) {
      notificationService.error(t('billing.pleaseAddProducts'));
      return;
    }
    try {
      if (editInvoiceId) {
        heldMutationPendingRef.current = true;
        const response = await updateInvoice({
          id: editInvoiceId,
          data: { ...updateInvoicePayload, expected_version: activeHeldVersion },
        }).unwrap();
        updateActiveHeldVersion(response.data?.version);
        loadedInvoiceSnapshotRef.current = currentInvoiceSnapshot;
        setHeldConflict(false);
        notificationService.success(t('billing.draftSaved'));
        return;
      } else {
        const nextCounter = requestCounterLabel();
        if (!nextCounter) return;
        await createInvoice({ ...invoicePayload('DRAFT'), counter_label: nextCounter }).unwrap();
      }
      notificationService.success(t('billing.draftSaved'));
      resetForm();
      history.replace(ROUTES.BILLING);
    } catch (error: unknown) {
      if (isConflictError(error)) setHeldConflict(true);
      notificationService.error(apiErrorMessage(error, t('billing.failedToSaveDraft'), true));
    } finally {
      heldMutationPendingRef.current = false;
    }
  };

  const createFinalInvoice = async () => {
    if (editInvoiceId) {
      heldMutationPendingRef.current = true;
      try {
        const updated = await updateInvoice({
          id: editInvoiceId,
          data: { ...updateInvoicePayload, expected_version: activeHeldVersion },
        }).unwrap();
        const finalVersion = updated.data?.version ?? activeHeldVersion;
        updateActiveHeldVersion(finalVersion);
        await finalizeInvoice({ id: editInvoiceId, expected_version: finalVersion }).unwrap();
        return editInvoiceId;
      } finally {
        heldMutationPendingRef.current = false;
      }
    }
    const result = await createInvoice(invoicePayload('FINALIZED')).unwrap();
    if (!result.data?.id) throw new Error(t('billing.missingInvoice'));
    return result.data.id;
  };

  const handleCheckout = async (quickMode?: PaymentMode) => {
    if (barcodeWorkPendingRef.current > 0) {
      notificationService.error(t('billing.barcodeInProgress'));
      return;
    }
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
      if (isConflictError(error)) setHeldConflict(true);
      notificationService.error(apiErrorMessage(error, t('billing.failedToCreateInvoice'), true));
    }
  };

  const cancelPendingCheckout = async () => {
    const invoiceId = pendingInvoiceId;
    if (!invoiceId) return;

    try {
      heldMutationPendingRef.current = true;
      await cancelInvoice({
        id: invoiceId,
        reason: t('billing.paymentNotCompleted'),
        expected_version: invoiceId === editInvoiceId ? activeHeldVersion : undefined,
      }).unwrap();
      setShowPaymentModal(false);
      setPendingInvoiceId(null);
      invoiceIdempotencyKey.current = generateIdempotencyKey();
      paymentIdempotencyKey.current = generateIdempotencyKey();
      if (editInvoiceId) history.replace(ROUTES.BILLING);
      notificationService.success(t('billing.checkoutCancelled'));
    } catch (error: unknown) {
      if (isConflictError(error)) setHeldConflict(true);
      notificationService.error(apiErrorMessage(error, t('billing.failedToCancelCheckout'), true));
    } finally {
      heldMutationPendingRef.current = false;
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
          <div className="mb-3 flex items-center justify-between gap-3">
            <h1 className="text-xl font-black text-gray-900 sm:text-2xl">
              {editInvoiceId ? t('billing.editDraftInvoice') : t('billing.fastBilling')}
            </h1>
            <button
              ref={heldBillsTriggerRef}
              type="button"
              className="min-h-touch rounded-xl border border-sky-200 bg-white px-3 text-sm font-bold text-sky-700 shadow-sm"
              onClick={() => setShowHeldBills(true)}
            >
              {t('billing.heldBills.title')} ({heldBillsData?.data?.length || 0})
            </button>
          </div>

          {heldConflict && (
            <div
              role="alert"
              className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <span>{t('billing.heldBills.conflict')}</span>
              <button
                type="button"
                className="min-h-touch font-bold underline"
                onClick={() => void reloadHeldBill()}
              >
                {t('billing.heldBills.reload')}
              </button>
            </div>
          )}

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
                    onClick={() => setShowBarcodeTools((value) => !value)}
                  >
                    <IonIcon icon={scan} slot="icon-only" />
                  </IonButton>
                </div>
                {showBarcodeTools && (
                  <div className="mt-2 rounded-xl border border-sky-100 bg-sky-50 p-3">
                    <p className="mb-2 text-sm font-semibold text-sky-900">
                      {t('billing.barcodeScannerHint')}
                    </p>
                    <BarcodeScannerComponent
                      onScan={(barcode) => void addScannedBarcode(barcode)}
                      onError={(message) => notificationService.error(message)}
                    />
                    <form
                      className="mt-2 flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void addScannedBarcode(barcodeInput);
                      }}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        autoFocus
                        value={barcodeInput}
                        onChange={(event) => setBarcodeInput(event.target.value)}
                        aria-label={t('foundation.barcode.barcode')}
                        placeholder={t('billing.barcodeEntryPlaceholder')}
                        className="min-h-touch min-w-0 flex-1 rounded-xl border border-sky-200 bg-white px-3 text-base outline-none focus:border-sky-500"
                      />
                      <IonButton type="submit" disabled={barcodeLoading || !barcodeInput.trim()}>
                        {barcodeLoading ? t('common.loading') : t('common.add')}
                      </IonButton>
                    </form>
                  </div>
                )}
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
                    disabled={isBusy}
                    onClick={() => {
                      billGenerationRef.current += 1;
                      setCartItems([]);
                    }}
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
                      {t('payment.upi')}
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
                {t('payment.upi')}
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

        <IonModal
          isOpen={showHeldBills}
          className="held-bills-modal"
          onDidDismiss={() => {
            closeHeldBills();
            heldBillsTriggerRef.current?.focus();
          }}
        >
          {currentUser && (
            <HeldBillsPanel
              currentUser={currentUser}
              counterLabel={counterLabel}
              onRequestCounterLabel={requestCounterLabel}
              onBeforeResume={canResumeHeldBill}
              onResume={resumeHeldBill}
              onReleased={handleReleasedHeldBill}
              onClose={closeHeldBills}
              focusBillId={focusedHeldBillId}
              editingInvoiceId={editInvoiceId}
              editingHasChanges={hasLocalHeldChanges}
            />
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};
