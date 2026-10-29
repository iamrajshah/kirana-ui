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
import { PaymentModal, type SplitPaymentSubmissionOutcome } from '@components/PaymentModal';
import { Navbar } from '@components/Navbar';
import {
  useCreateInvoiceMutation,
  useCancelInvoiceMutation,
  useFinalizeInvoiceMutation,
  useGetFinalizedDocumentQuery,
  useGetHeldBillsQuery,
  useGetInvoiceByIdQuery,
  useLazyGetInvoiceByIdQuery,
  useQuoteInvoiceMutation,
  useRenewHeldBillMutation,
  useUpdateInvoiceMutation,
  type InvoiceQuote,
  type InvoiceQuotePayload,
} from '@core/api/invoiceApi';
import { useGetTenantSettingsQuery } from '@core/api/tenantSettingsApi';
import {
  useCreatePaymentMutation,
  useCreateSplitPaymentMutation,
  type SplitPaymentTender,
} from '@core/api/paymentApi';
import { useGetCustomerByIdQuery, useGetCustomersQuery } from '@core/api/customerApi';
import {
  useCreateProductFromBarcodeMutation,
  useGetBillingCatalogQuery,
  useLazyScanBarcodeQuery,
  type BillingSearchVariant,
} from '@core/api/productApi';
import notificationService, { apiErrorMessage } from '@core/services/notificationService';
import { ROUTES } from '@core/constants';
import { selectCurrentUser } from '@core/auth/authSlice';
import { useAppSelector } from '@core/hooks';
import type { Customer, HeldBill, Invoice, PaymentMode } from '@core/types';
import { formatCurrency, generateIdempotencyKey } from '@utils/helpers';
import type { BillingCartItem } from './billing.logic';
import { filterBillingCatalog, filterCustomers } from '@utils/localSearch';
import {
  addBillingCartItem,
  buildInvoiceItems,
  calculateBillingTotals,
  clearBillingCompletion,
  clearPendingBillingCheckout,
  loadBillingCompletion,
  loadPendingBillingCheckout,
  persistBillingCompletion,
  persistPendingBillingCheckout,
} from './billing.logic';
import { HeldBillsPanel } from './HeldBillsPanel';
import { SaleCompletionSheet } from './SaleCompletionSheet';
import {
  UnknownBarcodeResolution,
  type UnknownBarcodeProductInput,
} from './UnknownBarcodeResolution';
import {
  getReceiptOutputFeedback,
  mapReceiptDocument,
  useReceiptOutput,
  type ReceiptOutputAction,
} from '../invoices/receipt';

const COUNTER_LABEL_STORAGE_KEY = 'kirana_counter_label';
const LONG_BILL_PREVIEW_ITEMS = 5;

const isConflictError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'status' in error && error.status === 409;

const getApiStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null;
  return typeof error.status === 'number' ? error.status : null;
};

const isDefinitiveClientError = (error: unknown) => {
  const status = getApiStatus(error);
  return status !== null && status >= 400 && status < 500;
};

const isInvoiceSettled = (invoice: Invoice) => {
  if (invoice.status === 'PAID') return true;
  if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') return false;
  const total = Number(invoice.total_amount);
  const paid = Number(invoice.paid_amount ?? 0);
  const balance = Number(invoice.balance_amount ?? total - paid);
  return (
    Number.isFinite(total) &&
    total > 0 &&
    Number.isFinite(paid) &&
    paid >= total &&
    Number.isFinite(balance) &&
    balance <= 0
  );
};

export const BillingPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const currentUser = useAppSelector(selectCurrentUser);
  const billingStorageOwner = {
    userId: currentUser?.id || '',
    tenantId: currentUser?.tenant?.id || null,
  };
  const restoredPendingCheckout = useRef(
    currentUser ? loadPendingBillingCheckout(billingStorageOwner) : null
  ).current;
  const query = new URLSearchParams(location.search);
  const editInvoiceId = query.get('edit');
  const focusedHeldBillId = query.get('held');

  const {
    data: billingCatalogData,
    isLoading: billingCatalogLoading,
    isFetching: billingCatalogFetching,
  } = useGetBillingCatalogQuery();
  const [scanBarcode, { isFetching: barcodeLoading }] = useLazyScanBarcodeQuery();
  const [createProductFromBarcode, { isLoading: creatingBarcodeProduct }] =
    useCreateProductFromBarcodeMutation();
  const {
    data: customersData,
    isLoading: customersLoading,
    isFetching: customersFetching,
  } = useGetCustomersQuery({ skip: 0, take: 1000 });
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [quoteInvoice, { isLoading: quoting }] = useQuoteInvoiceMutation();
  const [cancelInvoice, { isLoading: cancelling }] = useCancelInvoiceMutation();
  const [updateInvoice, { isLoading: updating }] = useUpdateInvoiceMutation();
  const [finalizeInvoice, { isLoading: finalizing }] = useFinalizeInvoiceMutation();
  const [renewHeldBill] = useRenewHeldBillMutation();
  const [createPayment, { isLoading: paying }] = useCreatePaymentMutation();
  const [createSplitPayment, { isLoading: splittingPayment }] = useCreateSplitPaymentMutation();
  const [getInvoiceForSplitRecovery] = useLazyGetInvoiceByIdQuery();
  const {
    data: invoiceData,
    isLoading: invoiceLoading,
    refetch: refetchInvoice,
  } = useGetInvoiceByIdQuery(editInvoiceId || '', { skip: !editInvoiceId });
  const { data: heldBillsData } = useGetHeldBillsQuery({ take: 50 });
  const { data: tenantSettingsData, isLoading: tenantSettingsLoading } =
    useGetTenantSettingsQuery();

  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeTools, setShowBarcodeTools] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [cartItems, setCartItems] = useState<BillingCartItem[]>([]);
  const [showAllCartItems, setShowAllCartItems] = useState(false);
  const cartItemsRef = useRef<BillingCartItem[]>([]);
  const replaceCartItems = useCallback(
    (next: BillingCartItem[] | ((current: BillingCartItem[]) => BillingCartItem[])) => {
      const resolved = typeof next === 'function' ? next(cartItemsRef.current) : next;
      cartItemsRef.current = resolved;
      setCartItems(resolved);
      return resolved;
    },
    []
  );
  const hasLongBill = cartItems.length > LONG_BILL_PREVIEW_ITEMS;
  const visibleCartItems =
    hasLongBill && !showAllCartItems ? cartItems.slice(-LONG_BILL_PREVIEW_ITEMS) : cartItems;
  const [selectedCustomer, setSelectedCustomer] = useState<Pick<
    Customer,
    'id' | 'name' | 'phone' | 'state_code' | 'credit_balance'
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
  const [billDiscount, setBillDiscount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(Boolean(restoredPendingCheckout));
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(
    restoredPendingCheckout?.invoiceId ?? null
  );
  const [pendingPayable, setPendingPayable] = useState<number | null>(
    restoredPendingCheckout?.payable ?? null
  );
  const [pendingPreviousBalance, setPendingPreviousBalance] = useState(
    restoredPendingCheckout?.previousBalance ?? 0
  );
  const [pendingCustomerId, setPendingCustomerId] = useState<string | null>(
    restoredPendingCheckout?.customerId ?? null
  );
  const [pendingSplitTenders, setPendingSplitTenders] = useState<SplitPaymentTender[] | undefined>(
    restoredPendingCheckout?.splitTenders
  );
  const [completionInvoiceId, setCompletionInvoiceId] = useState<string | null>(() =>
    currentUser ? loadBillingCompletion(billingStorageOwner) : null
  );
  const [activeQuote, setActiveQuote] = useState<InvoiceQuote | null>(null);
  const [activeQuoteKey, setActiveQuoteKey] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState('');
  const [showHeldBills, setShowHeldBills] = useState(Boolean(focusedHeldBillId));
  const [counterLabel, setCounterLabel] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(COUNTER_LABEL_STORAGE_KEY)?.trim();
      return stored && stored.length <= 32 ? stored : null;
    } catch {
      return null;
    }
  });
  const [counterLabelDraft, setCounterLabelDraft] = useState('');
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const counterLabelRequestRef = useRef<((value: string | null) => void) | null>(null);
  const [activeHeldVersion, setActiveHeldVersion] = useState<number | undefined>();
  const activeHeldVersionRef = useRef<number | undefined>();
  const [heldConflict, setHeldConflict] = useState(false);
  const loadedInvoiceSnapshotRef = useRef<string | null>(null);
  const heldBillsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const invoiceIdempotencyKey = useRef(generateIdempotencyKey());
  const paymentIdempotencyKey = useRef(
    restoredPendingCheckout?.paymentIdempotencyKey ?? generateIdempotencyKey()
  );
  const quoteGenerationRef = useRef(0);

  const {
    data: completionDocumentData,
    isLoading: completionLoading,
    isError: completionError,
    refetch: refetchCompletionDocument,
  } = useGetFinalizedDocumentQuery(completionInvoiceId || '', {
    skip: !completionInvoiceId,
  });
  const receiptDocument =
    completionDocumentData?.data?.kind === 'FINALIZED_DOCUMENT'
      ? completionDocumentData.data
      : null;
  const completionReceipt = useMemo(
    () => (receiptDocument ? mapReceiptDocument(receiptDocument) : null),
    [receiptDocument]
  );
  const receiptOutput = useReceiptOutput();

  const customerId = selectedCustomer?.id || '';
  const {
    currentData: selectedCustomerData,
    isFetching: customerBalanceLoading,
    isError: customerBalanceError,
    refetch: refetchCustomerBalance,
  } = useGetCustomerByIdQuery(customerId, {
    skip: !customerId,
    refetchOnMountOrArgChange: true,
  });
  const matchingVariants = useMemo(
    () => filterBillingCatalog(billingCatalogData?.data ?? [], searchTerm),
    [billingCatalogData?.data, searchTerm]
  );
  const availableStockByVariant = useMemo(
    () =>
      new Map(
        (billingCatalogData?.data ?? []).map((variant) => [
          variant.id,
          Math.max(0, Number(variant.available_quantity) || 0),
        ])
      ),
    [billingCatalogData?.data]
  );
  const matchingCustomers = useMemo(
    () => filterCustomers(customersData?.data ?? [], customerSearchTerm).slice(0, 20),
    [customerSearchTerm, customersData?.data]
  );
  const searchLoading = billingCatalogLoading || billingCatalogFetching;
  const customerIndexLoading = customersLoading || customersFetching;
  const totals = useMemo(
    () => calculateBillingTotals(cartItems, billDiscount, 'amount', 0),
    [billDiscount, cartItems]
  );
  const tenantSettings = tenantSettingsData?.data;
  const isGstMode = tenantSettings?.document_mode === 'GST_TAX_INVOICE';
  const quoteUnavailableMessage = t('billing.quoteUnavailable');
  const resolvedPlaceOfSupply =
    placeOfSupplyCode || selectedCustomer?.state_code || tenantSettings?.state_code || '';
  const quotePayload = useMemo<InvoiceQuotePayload>(
    () => ({
      ...(customerId ? { customer_id: customerId } : {}),
      ...(resolvedPlaceOfSupply ? { place_of_supply_code: resolvedPlaceOfSupply } : {}),
      items: buildInvoiceItems(cartItems),
      discount_amount: totals.billDiscountAmount,
    }),
    [cartItems, customerId, resolvedPlaceOfSupply, totals.billDiscountAmount]
  );
  const quoteKey = useMemo(() => JSON.stringify(quotePayload), [quotePayload]);
  const displayedTotals =
    activeQuoteKey === quoteKey && activeQuote
      ? {
          subtotal: Number(activeQuote.subtotal_amount),
          billDiscountAmount: Number(activeQuote.bill_discount_amount),
          gstAmount: Number(activeQuote.gst_amount),
          total: Number(activeQuote.total_amount),
        }
      : { ...totals, gstAmount: 0 };
  const hasCurrentCustomerBalance = selectedCustomerData?.data?.id?.toString() === customerId;
  const previousCustomerBalance = customerId
    ? Number(
        hasCurrentCustomerBalance
          ? selectedCustomerData.data.credit_balance
          : selectedCustomer?.credit_balance
      ) || 0
    : 0;
  const previousCustomerOutstanding = Math.max(0, previousCustomerBalance);
  const customerAdvance = Math.max(0, -previousCustomerBalance);
  const totalCustomerDue = previousCustomerOutstanding + displayedTotals.total;
  const customerBalanceLabel =
    previousCustomerBalance < 0 ? t('billing.customerAdvance') : t('billing.previousKhata');
  const customerBalanceAmount =
    previousCustomerBalance < 0 ? customerAdvance : previousCustomerOutstanding;
  let customerBalanceDisplay = formatCurrency(customerBalanceAmount);
  if (customerBalanceLoading) customerBalanceDisplay = t('common.loading');
  if (customerBalanceError) customerBalanceDisplay = t('common.retry');
  let customerBannerText = t('billing.walkInHint');
  if (customerId) customerBannerText = `${customerBalanceLabel}: ${customerBalanceDisplay}`;
  if (customerId && customerBalanceLoading) {
    customerBannerText = t('billing.loadingPreviousKhata');
  }
  if (customerId && customerBalanceError) {
    customerBannerText = t('billing.previousKhataUnavailable');
  }
  const barcodeWorkPending = pendingBarcodeCount > 0 || barcodeLoading;
  const canCreateBarcodeProduct = Boolean(
    currentUser?.roles?.some((role) => ['OWNER', 'MANAGER'].includes(role.toUpperCase()))
  );
  const isBusy =
    creating ||
    updating ||
    finalizing ||
    paying ||
    cancelling ||
    barcodeWorkPending ||
    creatingBarcodeProduct;
  const checkoutQuoteReady =
    !tenantSettingsLoading &&
    (!customerId ||
      (!customerBalanceLoading && !customerBalanceError && hasCurrentCustomerBalance)) &&
    (!isGstMode || Boolean(activeQuote && activeQuoteKey === quoteKey && !quoting && !quoteError));
  const stockConflict = cartItems.some((item) => {
    const availableQuantity =
      availableStockByVariant.get(item.variant_id) ?? item.available_quantity;
    return availableQuantity !== undefined && item.quantity > availableQuantity;
  });
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
      counterLabelRequestRef.current?.(null);
      counterLabelRequestRef.current = null;
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
            state_code: attachedCustomer.state_code,
            credit_balance: attachedCustomer.credit_balance,
          }
        : null
    );
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
    setBillDiscount(nextDiscount);
    replaceCartItems(nextCartItems);
    setShowAllCartItems(false);
    updateActiveHeldVersion(invoice.held_at ? invoice.version : undefined);
    setHeldConflict(false);
    loadedInvoiceSnapshotRef.current = JSON.stringify({
      customer_id: attachedCustomer?.id?.toString() || null,
      items: buildInvoiceItems(nextCartItems),
      gst_amount: 0,
      discount_amount: calculateBillingTotals(nextCartItems, nextDiscount, 'amount', 0)
        .billDiscountAmount,
    });
  }, [editInvoiceId, invoiceData, invoiceLoading, t, replaceCartItems, updateActiveHeldVersion]);

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
    quoteGenerationRef.current += 1;
    const generation = quoteGenerationRef.current;
    setActiveQuote(null);
    setActiveQuoteKey(null);
    setQuoteError(null);
    if (!isGstMode || !cartItems.length || completionInvoiceId) return;

    let cancelled = false;
    let request: ReturnType<typeof quoteInvoice> | null = null;
    const timer = window.setTimeout(async () => {
      try {
        request = quoteInvoice(quotePayload);
        const result = await request.unwrap();
        if (cancelled || generation !== quoteGenerationRef.current || !result.data) return;
        setActiveQuote(result.data);
        setActiveQuoteKey(quoteKey);
      } catch (error: unknown) {
        if (cancelled || generation !== quoteGenerationRef.current) return;
        setQuoteError(apiErrorMessage(error, quoteUnavailableMessage, true));
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      request?.abort?.();
    };
  }, [
    cartItems.length,
    completionInvoiceId,
    isGstMode,
    quoteInvoice,
    quoteKey,
    quotePayload,
    quoteUnavailableMessage,
  ]);

  const addToCart = (
    value: Pick<
      BillingSearchVariant,
      'id' | 'product_name' | 'price' | 'sku' | 'available_quantity'
    >
  ) => {
    const result = addBillingCartItem(cartItemsRef.current, {
      variant_id: value.id,
      available_quantity: value.available_quantity,
      unit_price: Number(value.price || 0),
      discount_amount: 0,
      discount_type: 'amount',
      product_name: value.product_name || t('billing.unknownProduct'),
      sku: value.sku || '',
    });
    replaceCartItems(result.cart);
    if (result.outcome === 'added' || result.outcome === 'incremented') setSearchTerm('');
    return result.outcome;
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
          barcodeQueueRef.current = [];
          barcodeWorkPendingRef.current = 1;
          setUnknownBarcode(queuedBarcode.barcode);
          setShowBarcodeTools(false);
          continue;
        }

        const { inventory, product, variant } = result.data;
        if (product.is_active !== true || variant.is_active !== true) {
          notificationService.error(t('billing.barcodeUnavailable'));
          continue;
        }

        const outcome = addToCart({
          id: variant.id,
          product_name: product.name,
          price: Number(variant.selling_price ?? variant.price ?? 0),
          sku: variant.sku || '',
          available_quantity: inventory?.quantity ?? 0,
        });
        setShowBarcodeTools(false);
        if (outcome === 'added' || outcome === 'incremented') {
          notificationService.success(t('billing.barcodeAdded'));
        } else {
          notificationService.error(
            t(outcome === 'out-of-stock' ? 'billing.outOfStock' : 'billing.stockLimit', {
              count: inventory?.quantity ?? 0,
            })
          );
        }
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
    replaceCartItems((current) => {
      const existing = current.find((item) => item.variant_id === variantId);
      if (!existing) return current;
      if (quantity <= 0) return current.filter((item) => item.variant_id !== variantId);
      const availableQuantity =
        availableStockByVariant.get(existing.variant_id) ?? existing.available_quantity;
      const boundedQuantity =
        availableQuantity === undefined
          ? quantity
          : Math.min(quantity, Math.max(1, availableQuantity));
      if (existing.quantity === boundedQuantity) return current;
      return current.map((item) =>
        item.variant_id === variantId ? { ...item, quantity: boundedQuantity } : item
      );
    });
  };

  const createUnknownBarcodeProduct = async (input: UnknownBarcodeProductInput) => {
    if (!unknownBarcode || !canCreateBarcodeProduct) return;
    try {
      const response = await createProductFromBarcode({
        barcode: unknownBarcode,
        productMaster: { name: input.name },
        product: { name: input.name },
        variant: {
          mrp: input.sellingPrice,
          sellingPrice: input.sellingPrice,
        },
        inventory: { quantity: input.openingStock },
      }).unwrap();
      const created = response.data;
      if (!created?.variant?.id || !created.product?.name) {
        throw new Error(t('billing.unknownBarcode.invalidResponse'));
      }
      const outcome = addToCart({
        id: created.variant.id,
        product_name: created.product.name,
        price: Number(created.variant.selling_price ?? created.variant.price ?? input.sellingPrice),
        sku: created.variant.sku || '',
        available_quantity: created.inventory.quantity,
      });
      setUnknownBarcode(null);
      notificationService.success(
        t(
          outcome === 'added' || outcome === 'incremented'
            ? 'billing.unknownBarcode.createdAndAdded'
            : 'billing.unknownBarcode.createdOutOfStock'
        )
      );
    } catch (error: unknown) {
      notificationService.error(
        apiErrorMessage(error, t('billing.unknownBarcode.createFailed'), true)
      );
    }
  };

  const updatePrice = (variantId: string, price: number) => {
    replaceCartItems((current) => {
      const existing = current.find((item) => item.variant_id === variantId);
      if (!existing || existing.unit_price === price) return current;
      return current.map((item) =>
        item.variant_id === variantId ? { ...item, unit_price: price } : item
      );
    });
  };

  const resetForm = () => {
    billGenerationRef.current += 1;
    replaceCartItems([]);
    setShowAllCartItems(false);
    setBillDiscount(0);
    setSearchTerm('');
    setBarcodeInput('');
    setShowBarcodeTools(false);
    setUnknownBarcode(null);
    setCustomerSearchTerm('');
    setShowCustomerSearch(false);
    setSelectedCustomer(null);
    setShowPaymentModal(false);
    setPendingInvoiceId(null);
    setPendingPayable(null);
    setPendingPreviousBalance(0);
    setPendingCustomerId(null);
    setPendingSplitTenders(undefined);
    setActiveQuote(null);
    setActiveQuoteKey(null);
    setQuoteError(null);
    setPlaceOfSupplyCode('');
    updateActiveHeldVersion(undefined);
    setHeldConflict(false);
    loadedInvoiceSnapshotRef.current = null;
    invoiceIdempotencyKey.current = generateIdempotencyKey();
    paymentIdempotencyKey.current = generateIdempotencyKey();
  };

  const invoicePayload = (status: 'DRAFT' | 'FINALIZED', quote?: InvoiceQuote) => ({
    ...(customerId ? { customer_id: customerId } : {}),
    items: buildInvoiceItems(cartItems),
    gst_amount: 0,
    discount_amount: totals.billDiscountAmount,
    status,
    idempotency_key: invoiceIdempotencyKey.current,
    ...(quote && {
      place_of_supply_code: resolvedPlaceOfSupply || undefined,
      quote_fingerprint: quote.fingerprint,
      quoted_payable: quote.total_amount,
    }),
  });

  const updateInvoicePayload = useMemo(
    () => ({
      customer_id: customerId || null,
      items: buildInvoiceItems(cartItems),
      gst_amount: 0,
      discount_amount: totals.billDiscountAmount,
    }),
    [cartItems, customerId, totals.billDiscountAmount]
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

  const requestCounterLabel = async (force = false): Promise<string | null> => {
    if (counterLabel && !force) return counterLabel;
    return new Promise((resolve) => {
      counterLabelRequestRef.current?.(null);
      counterLabelRequestRef.current = resolve;
      setCounterLabelDraft(counterLabel || '');
      setShowCounterDialog(true);
    });
  };

  const closeCounterDialog = (value: string | null) => {
    const resolve = counterLabelRequestRef.current;
    counterLabelRequestRef.current = null;
    setShowCounterDialog(false);
    resolve?.(value);
  };

  const saveCounterLabel = () => {
    const nextLabel = counterLabelDraft.trim();
    if (!nextLabel || nextLabel.length > 32) {
      notificationService.error(t('billing.heldBills.counterInvalid'));
      return;
    }
    try {
      localStorage.setItem(COUNTER_LABEL_STORAGE_KEY, nextLabel);
    } catch {
      // The active counter still works for this session when browser storage is unavailable.
    }
    setCounterLabel(nextLabel);
    closeCounterDialog(nextLabel);
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
      ...(pendingCustomerId || customerId ? { customer_id: pendingCustomerId || customerId } : {}),
      invoice_id: invoiceId,
      amount,
      payment_mode: mode,
      reference_note: reference,
      idempotency_key: paymentIdempotencyKey.current,
    }).unwrap();
  };

  const rememberPendingCheckout = (invoiceId: string, payable: number, previousBalance: number) => {
    const checkout = {
      invoiceId,
      payable,
      previousBalance,
      customerId: customerId || null,
      paymentIdempotencyKey: paymentIdempotencyKey.current,
    };
    persistPendingBillingCheckout(checkout, billingStorageOwner);
    setPendingInvoiceId(invoiceId);
    setPendingPayable(payable);
    setPendingPreviousBalance(previousBalance);
    setPendingCustomerId(checkout.customerId);
    setPendingSplitTenders(undefined);
  };

  const showCompletion = (invoiceId: string) => {
    clearPendingBillingCheckout();
    persistBillingCompletion(invoiceId, billingStorageOwner);
    setCompletionInvoiceId(invoiceId);
    setShowPaymentModal(false);
    resetForm();
    if (editInvoiceId || focusedHeldBillId || location.search) {
      history.replace(ROUTES.BILLING);
    }
  };

  const completePayment = (invoiceId: string) => {
    notificationService.success(t('billing.paymentRecordedSuccessfully'));
    showCompletion(invoiceId);
  };

  const validateBillReady = () => {
    if (barcodeWorkPendingRef.current > 0) {
      notificationService.error(t('billing.barcodeInProgress'));
      return false;
    }
    if (!cartItems.length) {
      notificationService.error(t('billing.pleaseAddProducts'));
      return false;
    }
    if (stockConflict) {
      notificationService.error(t('billing.stockChanged'));
      return false;
    }
    return true;
  };

  const handleSaveAsDraft = async () => {
    if (!validateBillReady()) return;
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
        const nextCounter = await requestCounterLabel();
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

  const fetchCheckoutQuote = async (): Promise<InvoiceQuote | null> => {
    try {
      const result = await quoteInvoice(quotePayload).unwrap();
      const quote = result.data;
      if (!quote) throw new Error(t('billing.quoteUnavailable'));
      const displayedQuote = activeQuoteKey === quoteKey ? activeQuote : null;
      if (
        quote.document_mode === 'GST_TAX_INVOICE' &&
        (!displayedQuote || displayedQuote.fingerprint !== quote.fingerprint)
      ) {
        setActiveQuote(quote);
        setActiveQuoteKey(quoteKey);
        notificationService.error(t('billing.quoteChangedReview'));
        return null;
      }
      setActiveQuote(quote);
      setActiveQuoteKey(quoteKey);
      return quote;
    } catch (error: unknown) {
      notificationService.error(apiErrorMessage(error, t('billing.quoteUnavailable'), true));
      return null;
    }
  };

  const createFinalInvoice = async (quote: InvoiceQuote) => {
    if (editInvoiceId) {
      heldMutationPendingRef.current = true;
      try {
        const updated = await updateInvoice({
          id: editInvoiceId,
          data: { ...updateInvoicePayload, expected_version: activeHeldVersion },
        }).unwrap();
        const finalVersion = updated.data?.version ?? activeHeldVersion;
        updateActiveHeldVersion(finalVersion);
        await finalizeInvoice({
          id: editInvoiceId,
          expected_version: finalVersion,
          place_of_supply_code: resolvedPlaceOfSupply || undefined,
          quote_fingerprint: quote.fingerprint,
          quoted_payable: quote.total_amount,
        }).unwrap();
        return editInvoiceId;
      } finally {
        heldMutationPendingRef.current = false;
      }
    }
    const result = await createInvoice(invoicePayload('FINALIZED', quote)).unwrap();
    if (!result.data?.id) throw new Error(t('billing.missingInvoice'));
    return result.data.id;
  };

  const handleCheckout = async (quickMode?: PaymentMode) => {
    if (!validateBillReady()) return;
    let invoiceId: string | null = null;
    const previousBalanceAtCheckout = previousCustomerBalance;
    try {
      const quote = await fetchCheckoutQuote();
      if (!quote) return;
      invoiceId = await createFinalInvoice(quote);
      const payable = Number(quote.total_amount);
      rememberPendingCheckout(invoiceId, payable, previousBalanceAtCheckout);
      if (quickMode) {
        try {
          await recordPayment(invoiceId, payable, quickMode);
          completePayment(invoiceId);
          return;
        } catch (paymentError) {
          setShowPaymentModal(true);
          notificationService.error(
            apiErrorMessage(paymentError, t('billing.paymentFailed'), true)
          );
          return;
        }
      }
      setShowPaymentModal(true);
    } catch (error: unknown) {
      if (isConflictError(error)) setHeldConflict(true);
      notificationService.error(apiErrorMessage(error, t('billing.failedToCreateInvoice'), true));
    }
  };

  const handlePayLater = async () => {
    if (!validateBillReady()) return;
    if (!customerId) {
      notificationService.error(t('billing.creditRequiresCustomer'));
      return;
    }
    try {
      const quote = await fetchCheckoutQuote();
      if (!quote) return;
      const invoiceId = await createFinalInvoice(quote);
      notificationService.success(t('billing.creditBillCreated'));
      showCompletion(invoiceId);
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
      setPendingPayable(null);
      setPendingPreviousBalance(0);
      setPendingCustomerId(null);
      setPendingSplitTenders(undefined);
      clearPendingBillingCheckout();
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
      completePayment(pendingInvoiceId);
    } catch (error: unknown) {
      notificationService.error(apiErrorMessage(error, t('billing.paymentFailed'), true));
      throw error;
    }
  };

  const handleModalSplitPayment = async (
    tenders: SplitPaymentTender[]
  ): Promise<SplitPaymentSubmissionOutcome> => {
    if (!pendingInvoiceId) {
      notificationService.error(t('billing.missingInvoice'));
      return 'rejected';
    }

    const customer = pendingCustomerId || customerId || null;
    // Persist the exact multi-tender payload before the request. If the response
    // is lost, recovery can safely replay the same atomic operation and key.
    persistPendingBillingCheckout(
      {
        invoiceId: pendingInvoiceId,
        payable: pendingPayable ?? displayedTotals.total,
        previousBalance: pendingPreviousBalance,
        customerId: customer,
        paymentIdempotencyKey: paymentIdempotencyKey.current,
        splitTenders: tenders,
      },
      billingStorageOwner
    );
    setPendingSplitTenders(tenders);

    try {
      await createSplitPayment({
        ...(customer ? { customer_id: customer } : {}),
        invoice_id: pendingInvoiceId,
        tenders,
        idempotency_key: paymentIdempotencyKey.current,
      }).unwrap();
      completePayment(pendingInvoiceId);
      return 'completed';
    } catch (error: unknown) {
      const paymentErrorMessage = apiErrorMessage(error, t('billing.paymentFailed'), true);
      if (!isDefinitiveClientError(error)) {
        // A network/timeout/5xx result may have committed without returning a
        // response. Keep both the payload and idempotency key locked for an
        // exact safe replay.
        notificationService.error(paymentErrorMessage);
        return 'uncertain';
      }

      try {
        const refreshed = await getInvoiceForSplitRecovery(pendingInvoiceId, false).unwrap();
        if (refreshed.data && isInvoiceSettled(refreshed.data)) {
          completePayment(pendingInvoiceId);
          return 'completed';
        }
      } catch (refreshError: unknown) {
        if (!isDefinitiveClientError(refreshError)) {
          notificationService.error(paymentErrorMessage);
          return 'uncertain';
        }
        // A second definitive 4xx still proves there was no ambiguous server
        // outcome. Reopen the form rather than trapping the cashier.
      }

      paymentIdempotencyKey.current = generateIdempotencyKey();
      persistPendingBillingCheckout(
        {
          invoiceId: pendingInvoiceId,
          payable: pendingPayable ?? displayedTotals.total,
          previousBalance: pendingPreviousBalance,
          customerId: customer,
          paymentIdempotencyKey: paymentIdempotencyKey.current,
        },
        billingStorageOwner
      );
      setPendingSplitTenders(undefined);
      notificationService.error(paymentErrorMessage);
      return 'rejected';
    }
  };

  const handleReceiptOutput = async (action: ReceiptOutputAction) => {
    if (!completionReceipt) return;
    const paperWidth = tenantSettings?.default_paper_width === 'MM58' ? '58mm' : '80mm';
    const result = await receiptOutput.run(action, completionReceipt, paperWidth);
    if (result.phase === 'recoverable-error') {
      notificationService.error(t('billing.completion.outputFailed'));
    }
  };

  const startNewSale = () => {
    if (receiptOutput.isBusy) return;
    clearBillingCompletion();
    clearPendingBillingCheckout();
    receiptOutput.reset();
    setCompletionInvoiceId(null);
    resetForm();
    history.replace(ROUTES.BILLING);
  };

  const completionOutputFeedback = getReceiptOutputFeedback(receiptOutput.state);
  const completionOutputMessage = completionOutputFeedback
    ? t(
        {
          working: 'billing.completion.preparingOutput',
          downloaded: 'billing.completion.pdfDownloaded',
          error: 'billing.completion.outputFailed',
        }[completionOutputFeedback]
      )
    : null;

  return (
    <IonPage>
      <Navbar
        title={
          completionInvoiceId
            ? t('billing.completion.title')
            : editInvoiceId
              ? t('billing.editDraftInvoice')
              : t('billing.fastBilling')
        }
      />
      <IonContent>
        <Loading
          isOpen={!completionInvoiceId && (invoiceLoading || isBusy)}
          message={invoiceLoading ? t('billing.loadingInvoice') : t('billing.processingBill')}
        />

        {completionInvoiceId ? (
          <SaleCompletionSheet
            invoiceId={completionInvoiceId}
            receipt={completionReceipt}
            isLoading={completionLoading}
            isError={
              completionError || Boolean(completionDocumentData?.data?.kind === 'NON_DOCUMENT')
            }
            outputBusy={receiptOutput.isBusy}
            outputMessage={completionOutputMessage}
            onRetry={() => void refetchCompletionDocument()}
            onViewBill={() => history.push(`${ROUTES.INVOICES}/${completionInvoiceId}`)}
            onNewSale={startNewSale}
            onOutput={(action) => void handleReceiptOutput(action)}
          />
        ) : (
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
                  <p className="text-xs text-gray-600">{customerBannerText}</p>
                  {customerId && customerBalanceError && (
                    <button
                      type="button"
                      className="mt-1 text-xs font-bold text-sky-700 underline"
                      onClick={() => void refetchCustomerBalance()}
                    >
                      {t('common.retry')}
                    </button>
                  )}
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
                  {customerIndexLoading && (
                    <p className="p-2 text-sm text-gray-500">{t('common.loading')}</p>
                  )}
                  {customerSearchTerm && (
                    <IonList className="max-h-52 overflow-auto">
                      {matchingCustomers.map((customer) => (
                        <IonItem
                          key={customer.id}
                          button
                          detail
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setPlaceOfSupplyCode('');
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
                        setPlaceOfSupplyCode('');
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
                  {searchTerm && (
                    <IonList className="max-h-64 overflow-auto">
                      {matchingVariants.map((variant) => {
                        const outOfStock = variant.available_quantity <= 0;
                        return (
                          <IonItem
                            key={variant.id}
                            button
                            disabled={outOfStock}
                            onClick={() => addToCart(variant)}
                            style={{ '--min-height': '56px' }}
                          >
                            <IonLabel>
                              <h3 className="font-semibold">{variant.product_name}</h3>
                              <p>{variant.sku}</p>
                              <p className={outOfStock ? 'font-semibold text-red-600' : undefined}>
                                {outOfStock
                                  ? t('billing.outOfStock')
                                  : t('billing.availableStock', {
                                      count: variant.available_quantity,
                                    })}
                              </p>
                            </IonLabel>
                            <strong className="mr-2">{formatCurrency(variant.price)}</strong>
                            {!outOfStock && <IonIcon icon={add} slot="end" color="primary" />}
                          </IonItem>
                        );
                      })}
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
                        replaceCartItems([]);
                        setShowAllCartItems(false);
                      }}
                    >
                      {t('billing.clearCart')}
                    </button>
                  )}
                </div>

                {hasLongBill && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                    <p className="text-xs font-semibold text-sky-900">
                      {showAllCartItems
                        ? t('billing.allItemsShown', { count: cartItems.length })
                        : t('billing.showingRecentItems', {
                            shown: LONG_BILL_PREVIEW_ITEMS,
                            total: cartItems.length,
                          })}
                    </p>
                    <button
                      type="button"
                      className="min-h-touch shrink-0 rounded-lg px-2 text-xs font-bold text-sky-700 underline"
                      aria-label={
                        showAllCartItems
                          ? t('billing.showRecentItems')
                          : t('billing.reviewAllItems', { count: cartItems.length })
                      }
                      onClick={() => setShowAllCartItems((current) => !current)}
                    >
                      {showAllCartItems
                        ? t('billing.showRecentItems')
                        : t('billing.reviewAllItems', { count: cartItems.length })}
                    </button>
                  </div>
                )}

                {cartItems.length === 0 ? (
                  <div className="mt-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center">
                    <IonIcon icon={scan} className="mb-2 text-4xl text-sky-500" />
                    <p className="font-semibold text-gray-800">{t('billing.emptyCart')}</p>
                    <p className="mt-1 text-sm text-gray-500">{t('billing.emptyCartHint')}</p>
                  </div>
                ) : (
                  <div
                    className={`mt-2 space-y-2 ${
                      hasLongBill && showAllCartItems
                        ? 'max-h-[65vh] overflow-y-auto overscroll-contain pr-1'
                        : ''
                    }`}
                  >
                    {visibleCartItems.map((item) => {
                      const availableQuantity =
                        availableStockByVariant.get(item.variant_id) ?? item.available_quantity;
                      const stockKnown = availableQuantity !== undefined;
                      const exceedsStock = stockKnown && item.quantity > Number(availableQuantity);
                      const atStockLimit = stockKnown && item.quantity >= Number(availableQuantity);
                      return (
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
                                    aria-label={t('billing.decreaseQuantity', {
                                      product: item.product_name,
                                    })}
                                    className="flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-gray-300 bg-white"
                                    onClick={() =>
                                      updateQuantity(item.variant_id, item.quantity - 1)
                                    }
                                  >
                                    <IonIcon icon={remove} />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    max={availableQuantity}
                                    aria-label={t('billing.quantityFor', {
                                      product: item.product_name,
                                    })}
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
                                    aria-label={t('billing.increaseQuantity', {
                                      product: item.product_name,
                                    })}
                                    disabled={atStockLimit}
                                    className="flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-gray-300 bg-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                    onClick={() =>
                                      updateQuantity(item.variant_id, item.quantity + 1)
                                    }
                                  >
                                    <IonIcon icon={add} />
                                  </button>
                                </div>
                                {stockKnown && (
                                  <p
                                    className={`mt-1 text-xs font-semibold ${
                                      atStockLimit ? 'text-red-600' : 'text-gray-500'
                                    }`}
                                    role={atStockLimit ? 'status' : undefined}
                                  >
                                    {atStockLimit
                                      ? t('billing.stockLimit', {
                                          count: availableQuantity,
                                        })
                                      : t('billing.availableStock', {
                                          count: availableQuantity,
                                        })}
                                  </p>
                                )}
                                {exceedsStock && (
                                  <p
                                    role="alert"
                                    className="mt-1 text-xs font-semibold text-red-600"
                                  >
                                    {t('billing.reduceQuantityToAvailable', {
                                      count: availableQuantity,
                                    })}
                                  </p>
                                )}
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
                      );
                    })}
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
                        <strong>{formatCurrency(displayedTotals.subtotal)}</strong>
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
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-600">{t('billing.gstAmount')}</span>
                        <strong>{formatCurrency(displayedTotals.gstAmount)}</strong>
                      </div>
                      {isGstMode && (
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-gray-600">{t('billing.placeOfSupplyCode')}</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{2}"
                            maxLength={2}
                            value={resolvedPlaceOfSupply}
                            aria-label={t('billing.placeOfSupplyCode')}
                            className="min-h-touch w-20 rounded-xl border border-gray-300 px-3 text-center font-semibold outline-none"
                            onChange={(event) =>
                              setPlaceOfSupplyCode(
                                event.target.value.replace(/\D/g, '').slice(0, 2)
                              )
                            }
                          />
                        </label>
                      )}
                      {quoteError && (
                        <p
                          role="alert"
                          className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800"
                        >
                          {quoteError}
                        </p>
                      )}
                      <div className="border-t border-gray-200 pt-3">
                        {customerId && (
                          <div className="mb-3 space-y-2 rounded-xl bg-sky-50 p-3">
                            <div className="flex justify-between text-sm text-gray-700">
                              <span>{customerBalanceLabel}</span>
                              <strong>{customerBalanceDisplay}</strong>
                            </div>
                            <div className="flex justify-between text-sm text-gray-700">
                              <span>{t('billing.todaysBill')}</span>
                              <strong>{formatCurrency(displayedTotals.total)}</strong>
                            </div>
                            {previousCustomerBalance >= 0 && (
                              <div className="flex justify-between border-t border-sky-200 pt-2 font-bold text-gray-900">
                                <span>{t('billing.totalCustomerDue')}</span>
                                <strong className="text-lg text-sky-700">
                                  {customerBalanceLoading || customerBalanceError
                                    ? customerBalanceDisplay
                                    : formatCurrency(totalCustomerDue)}
                                </strong>
                              </div>
                            )}
                            {previousCustomerBalance < 0 && (
                              <p className="border-t border-sky-200 pt-2 text-xs text-gray-600">
                                {t('billing.advanceNotApplied')}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex items-end justify-between">
                          <span className="font-bold text-gray-900">
                            {t('billing.amountToCollect')}
                          </span>
                          <strong className="text-2xl text-sky-700">
                            {formatCurrency(displayedTotals.total)}
                          </strong>
                        </div>
                        {customerId && (
                          <p className="mt-2 text-xs text-gray-600">
                            {t('billing.currentBillPaymentOnly')}
                          </p>
                        )}
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
                        disabled={
                          !cartItems.length || isBusy || !checkoutQuoteReady || stockConflict
                        }
                        onClick={() => handleCheckout('CASH')}
                      >
                        <IonIcon icon={cash} slot="start" />
                        {t('billing.payCash')}
                      </IonButton>
                      <IonButton
                        color="primary"
                        className="min-h-touch"
                        disabled={
                          !cartItems.length || isBusy || !checkoutQuoteReady || stockConflict
                        }
                        onClick={() => handleCheckout('UPI')}
                      >
                        {t('payment.upi')}
                      </IonButton>
                      <IonButton
                        fill="outline"
                        className="min-h-touch"
                        disabled={
                          !cartItems.length || isBusy || !checkoutQuoteReady || stockConflict
                        }
                        onClick={() => handleCheckout()}
                      >
                        <IonIcon icon={card} slot="start" />
                        {t('billing.otherPayment')}
                      </IonButton>
                      <IonButton
                        fill="clear"
                        className="min-h-touch"
                        disabled={!cartItems.length || isBusy || stockConflict}
                        onClick={handleSaveAsDraft}
                      >
                        <IonIcon icon={bookmark} slot="start" />
                        {editInvoiceId ? t('billing.update') : t('billing.holdBill')}
                      </IonButton>
                      {customerId && (
                        <IonButton
                          fill="outline"
                          color="warning"
                          className="col-span-2 min-h-touch"
                          disabled={
                            !cartItems.length || isBusy || !checkoutQuoteReady || stockConflict
                          }
                          onClick={() => void handlePayLater()}
                        >
                          {t('billing.payLater')}
                        </IonButton>
                      )}
                    </div>
                  </IonCardContent>
                </IonCard>
              </aside>
            </div>
          </main>
        )}

        {!completionInvoiceId && cartItems.length > 0 && (
          <div className="fixed inset-x-0 bottom-14 z-20 border-t border-gray-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{t('billing.amountToCollect')}</p>
                <p className="truncate text-xl font-black text-sky-700">
                  {formatCurrency(displayedTotals.total)}
                </p>
              </div>
              <IonButton
                color="success"
                disabled={isBusy || !checkoutQuoteReady || stockConflict}
                onClick={() => handleCheckout('CASH')}
              >
                {t('billing.cash')}
              </IonButton>
              <IonButton
                disabled={isBusy || !checkoutQuoteReady || stockConflict}
                onClick={() => handleCheckout('UPI')}
              >
                {t('payment.upi')}
              </IonButton>
              <IonButton
                fill="outline"
                disabled={isBusy || !checkoutQuoteReady || stockConflict}
                onClick={() => handleCheckout()}
              >
                <IonIcon icon={card} slot="icon-only" />
              </IonButton>
              {customerId && (
                <IonButton
                  color="warning"
                  disabled={isBusy || !checkoutQuoteReady || stockConflict}
                  onClick={() => void handlePayLater()}
                >
                  {t('billing.khata')}
                </IonButton>
              )}
            </div>
          </div>
        )}

        {pendingInvoiceId && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={cancelPendingCheckout}
            onPayment={handleModalPayment}
            onSplitPayment={handleModalSplitPayment}
            initialSplitTenders={pendingSplitTenders}
            invoiceAmount={pendingPayable ?? displayedTotals.total}
            previousBalance={pendingPreviousBalance}
            paidAmount={0}
            isLoading={paying || splittingPayment}
            allowPartial={Boolean(pendingCustomerId || customerId)}
          />
        )}

        <IonModal
          isOpen={showCounterDialog}
          backdropDismiss={false}
          onDidDismiss={() => closeCounterDialog(null)}
        >
          <div className="mx-auto flex min-h-full w-full max-w-lg items-center px-4 py-8">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="counter-dialog-title"
              className="w-full rounded-2xl bg-white p-5 shadow-xl"
            >
              <h2 id="counter-dialog-title" className="text-xl font-bold text-gray-900">
                {t('billing.heldBills.counterTitle')}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{t('billing.heldBills.counterHint')}</p>
              <label className="mt-4 block text-sm font-semibold text-gray-700">
                {t('billing.heldBills.counterPrompt')}
                <input
                  autoFocus
                  aria-label={t('billing.heldBills.counterPrompt')}
                  className="mt-2 min-h-touch w-full rounded-xl border border-gray-300 px-3 text-base outline-none focus:border-sky-500"
                  maxLength={32}
                  value={counterLabelDraft}
                  onChange={(event) => setCounterLabelDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveCounterLabel();
                  }}
                />
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <IonButton fill="clear" onClick={() => closeCounterDialog(null)}>
                  {t('common.cancel')}
                </IonButton>
                <IonButton onClick={saveCounterLabel}>{t('common.save')}</IonButton>
              </div>
            </section>
          </div>
        </IonModal>

        <IonModal
          isOpen={Boolean(unknownBarcode)}
          aria-labelledby="unknown-barcode-title"
          onDidDismiss={() => setUnknownBarcode(null)}
        >
          {unknownBarcode && (
            <UnknownBarcodeResolution
              key={unknownBarcode}
              barcode={unknownBarcode}
              canCreate={canCreateBarcodeProduct}
              isCreating={creatingBarcodeProduct}
              onCreate={createUnknownBarcodeProduct}
              onDismiss={() => setUnknownBarcode(null)}
            />
          )}
        </IonModal>

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
