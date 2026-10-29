export interface BillingCartItem {
  variant_id: string;
  product_name: string;
  sku: string;
  available_quantity?: number;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  discount_type: 'amount' | 'percent';
}

export type AddBillingCartItemOutcome = 'added' | 'incremented' | 'at-stock-limit' | 'out-of-stock';

export const addBillingCartItem = (
  cart: BillingCartItem[],
  item: Omit<BillingCartItem, 'quantity'>
): { cart: BillingCartItem[]; outcome: AddBillingCartItemOutcome } => {
  const availableQuantity = Math.max(0, Number(item.available_quantity) || 0);
  if (availableQuantity === 0) return { cart, outcome: 'out-of-stock' };

  const existing = cart.find((entry) => entry.variant_id === item.variant_id);
  if (!existing) {
    return {
      cart: [...cart, { ...item, available_quantity: availableQuantity, quantity: 1 }],
      outcome: 'added',
    };
  }

  const refreshedCart = cart.map((entry) =>
    entry.variant_id === item.variant_id
      ? { ...entry, available_quantity: availableQuantity }
      : entry
  );
  if (existing.quantity >= availableQuantity) {
    return { cart: refreshedCart, outcome: 'at-stock-limit' };
  }

  return {
    cart: refreshedCart.map((entry) =>
      entry.variant_id === item.variant_id ? { ...entry, quantity: entry.quantity + 1 } : entry
    ),
    outcome: 'incremented',
  };
};

export const BILLING_COMPLETION_STORAGE_KEY = 'kirana_billing_completion_invoice';
export const BILLING_PENDING_CHECKOUT_STORAGE_KEY = 'kirana_billing_pending_checkout';

export interface BillingStorageOwner {
  userId: string;
  tenantId: string | null;
}

export interface PendingBillingCheckout {
  invoiceId: string;
  payable: number;
  previousBalance: number;
  customerId: string | null;
  paymentIdempotencyKey: string;
  splitTenders?: Array<{
    payment_mode: 'CASH' | 'UPI' | 'CARD' | 'BANK';
    amount: number;
    reference_note?: string;
  }>;
}

interface StoredBillingCompletion extends BillingStorageOwner {
  version: 1;
  invoiceId: string;
}

interface StoredPendingBillingCheckout extends BillingStorageOwner, PendingBillingCheckout {
  version: 1;
}

const readStoredValue = (key: string): unknown => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const writeStoredValue = (key: string, value: unknown) => {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const removeStoredValue = (key: string) => {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const belongsToOwner = (value: Partial<BillingStorageOwner>, owner: BillingStorageOwner) =>
  value.userId === owner.userId && value.tenantId === owner.tenantId;

const isStoredSplitTender = (
  tender: unknown
): tender is NonNullable<PendingBillingCheckout['splitTenders']>[number] =>
  typeof tender === 'object' &&
  tender !== null &&
  'payment_mode' in tender &&
  ['CASH', 'UPI', 'CARD', 'BANK'].includes(String(tender.payment_mode)) &&
  'amount' in tender &&
  typeof tender.amount === 'number' &&
  Number.isFinite(tender.amount) &&
  tender.amount > 0 &&
  (!('reference_note' in tender) ||
    tender.reference_note === undefined ||
    typeof tender.reference_note === 'string');

export const loadBillingCompletion = (owner: BillingStorageOwner): string | null => {
  const stored = readStoredValue(
    BILLING_COMPLETION_STORAGE_KEY
  ) as Partial<StoredBillingCompletion> | null;
  if (!stored || stored.version !== 1 || !belongsToOwner(stored, owner)) {
    if (stored) removeStoredValue(BILLING_COMPLETION_STORAGE_KEY);
    return null;
  }
  return typeof stored.invoiceId === 'string' && stored.invoiceId.trim()
    ? stored.invoiceId.trim()
    : null;
};

export const persistBillingCompletion = (invoiceId: string, owner: BillingStorageOwner) => {
  const normalized = invoiceId.trim();
  if (!normalized) return false;
  return writeStoredValue(BILLING_COMPLETION_STORAGE_KEY, {
    version: 1,
    invoiceId: normalized,
    ...owner,
  } satisfies StoredBillingCompletion);
};

export const clearBillingCompletion = () => {
  return removeStoredValue(BILLING_COMPLETION_STORAGE_KEY);
};

export const loadPendingBillingCheckout = (
  owner: BillingStorageOwner
): PendingBillingCheckout | null => {
  const stored = readStoredValue(
    BILLING_PENDING_CHECKOUT_STORAGE_KEY
  ) as Partial<StoredPendingBillingCheckout> | null;
  if (
    !stored ||
    stored.version !== 1 ||
    !belongsToOwner(stored, owner) ||
    typeof stored.invoiceId !== 'string' ||
    !stored.invoiceId.trim() ||
    typeof stored.payable !== 'number' ||
    !Number.isFinite(stored.payable) ||
    typeof stored.paymentIdempotencyKey !== 'string' ||
    !stored.paymentIdempotencyKey.trim()
  ) {
    if (stored) removeStoredValue(BILLING_PENDING_CHECKOUT_STORAGE_KEY);
    return null;
  }
  const storedSplitTenders = stored.splitTenders;
  const splitTenders =
    Array.isArray(storedSplitTenders) &&
    storedSplitTenders.length >= 2 &&
    storedSplitTenders.length <= 4 &&
    storedSplitTenders.every(isStoredSplitTender) &&
    new Set(storedSplitTenders.map((tender) => tender.payment_mode)).size ===
      storedSplitTenders.length &&
    storedSplitTenders.reduce((total, tender) => total + Math.round(tender.amount * 100), 0) ===
      Math.round(stored.payable * 100)
      ? storedSplitTenders
      : undefined;
  return {
    invoiceId: stored.invoiceId.trim(),
    payable: stored.payable,
    previousBalance:
      typeof stored.previousBalance === 'number' && Number.isFinite(stored.previousBalance)
        ? stored.previousBalance
        : 0,
    customerId: typeof stored.customerId === 'string' ? stored.customerId : null,
    paymentIdempotencyKey: stored.paymentIdempotencyKey,
    ...(splitTenders && splitTenders.length >= 2 ? { splitTenders } : {}),
  };
};

export const persistPendingBillingCheckout = (
  checkout: PendingBillingCheckout,
  owner: BillingStorageOwner
) =>
  writeStoredValue(BILLING_PENDING_CHECKOUT_STORAGE_KEY, {
    version: 1,
    ...checkout,
    ...owner,
  } satisfies StoredPendingBillingCheckout);

export const clearPendingBillingCheckout = () => {
  return removeStoredValue(BILLING_PENDING_CHECKOUT_STORAGE_KEY);
};

export const buildInvoiceItems = (cart: BillingCartItem[]) =>
  cart.map((item) => {
    const lineSubtotal = Number(item.unit_price) * Number(item.quantity);
    const discountAmount =
      item.discount_type === 'percent'
        ? (lineSubtotal * Number(item.discount_amount || 0)) / 100
        : Number(item.discount_amount || 0);

    return {
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.unit_price,
      discount_amount: discountAmount,
    };
  });

export const calculateBillingTotals = (
  cart: BillingCartItem[],
  billDiscount: number,
  billDiscountType: 'amount' | 'percent',
  gstAmount: number
) => {
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
    0
  );
  const billDiscountAmount =
    billDiscountType === 'percent'
      ? (subtotal * Number(billDiscount || 0)) / 100
      : Number(billDiscount || 0);

  return {
    subtotal,
    billDiscountAmount,
    total: Math.max(0, subtotal - billDiscountAmount) + Number(gstAmount || 0),
  };
};
