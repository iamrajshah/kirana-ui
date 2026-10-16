// Core Types - Match backend API contract exactly

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  roles: string[];
  tenant?: {
    id: string;
    name: string;
    status: string;
  };
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    tenant: {
      id: string;
      name: string;
      status: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
  message: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  postal_code?: string | null;
  gstin?: string | null;
  credit_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  hsn_code?: string | null;
  category_id: string;
  category?: Category;
  is_active: boolean;
  variants?: ProductVariant[];
  product_variants?: ProductVariant[]; // Backend returns this
}

export interface ProductVariant {
  id: string;
  product_id: string;
  brand?: string;
  size?: string;
  packaging?: string;
  sku: string;
  price: number;
  selling_price?: number; // Added for editable selling price
  mrp_price?: number;
  gst_percent?: number;
  uqc_code?: UqcCode | null;
  unit_label?: string | null;
  is_active: boolean;
  product?: Product;
  inventory?: Inventory;
  barcodes?: BarcodeInfo[];
}

export type DocumentMode = 'SIMPLE_RECEIPT' | 'GST_TAX_INVOICE';
export type ReceiptPaperWidth = 'MM58' | 'MM80';
export type UqcCode =
  | 'BAG'
  | 'BAL'
  | 'BDL'
  | 'BOX'
  | 'BTL'
  | 'CTN'
  | 'DOZ'
  | 'GMS'
  | 'KGS'
  | 'LTR'
  | 'MLT'
  | 'MTR'
  | 'NOS'
  | 'PAC'
  | 'PCS'
  | 'SET';

export interface TenantDocumentSettings {
  id: string | null;
  tenant_id: string;
  document_mode: DocumentMode;
  supplier_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  postal_code: string | null;
  gstin: string | null;
  phone: string | null;
  footer: string | null;
  authorized_signatory: string | null;
  default_paper_width: ReceiptPaperWidth;
  settings_version: number;
  created_at: string | null;
  updated_at: string | null;
  capabilities: {
    receipt_documents_enabled: boolean;
    supported_paper_widths: readonly ReceiptPaperWidth[];
    per_print_override: boolean;
  };
}

export type UpdateTenantDocumentSettings = Partial<
  Pick<
    TenantDocumentSettings,
    | 'document_mode'
    | 'supplier_name'
    | 'address_line1'
    | 'address_line2'
    | 'city'
    | 'state'
    | 'state_code'
    | 'postal_code'
    | 'gstin'
    | 'phone'
    | 'footer'
    | 'authorized_signatory'
    | 'default_paper_width'
  >
>;

export interface Inventory {
  variant_id: string;
  quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  variant?: ProductVariant;
}

export interface InvoiceItem {
  id?: string;
  variant_id: string;
  quantity: number;
  unit_price?: number; // Price per unit (for create/update - optional, overrides selling_price)
  price?: number; // Total line price (for backward compatibility)
  discount_amount?: number; // Item-level discount
  final_price?: number; // Final price after discount (returned from API)
  variant?: {
    id: string;
    sku: string;
    selling_price?: number;
    mrp_price?: number;
    product?: {
      id: string;
      name: string;
    };
  };
}

export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer?: Customer;
  items?: InvoiceItem[];
  subtotal_amount?: number; // Amount before discounts and GST
  discount_amount?: number; // Total discount (items + bill-level)
  gst_amount: number;
  total_amount: number;
  paid_amount?: number;
  balance_amount?: number; // Calculated: total - paid
  status: InvoiceStatus;
  invoice_url?: string;
  created_at: string;
  finalized_at?: string;
  cancelled_at?: string;
  created_by?: string | null;
  origin_counter?: string | null;
  held_at?: string | null;
  held_by?: string | null;
  held_counter?: string | null;
  lease_expires_at?: string | null;
  version?: number;
  updated_at?: string;
}

export type HeldBillLeaseState = 'active' | 'unclaimed' | 'expired';

export interface HeldBillPerson {
  id: string;
  name: string;
}

export interface HeldBill extends Invoice {
  held_at: string;
  version: number;
  item_count: number;
  lease_state: HeldBillLeaseState;
  creator?: HeldBillPerson | null;
  holder?: HeldBillPerson | null;
}

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'ADJUSTMENT';

export type FinalizedDocumentPaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'AMOUNT_DUE';

export interface DocumentPartyDto {
  id?: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  state: string | null;
  state_code: string | null;
  gstin: string | null;
  signatory?: string | null;
}

export interface FinalizedDocumentDto {
  kind: 'FINALIZED_DOCUMENT';
  invoice_id: string;
  invoice_number: string | null;
  issued_at: string | null;
  document_mode: DocumentMode;
  legacy: boolean;
  cancellation: { cancelled: boolean; marker: string | null };
  supplier: DocumentPartyDto;
  customer: DocumentPartyDto | null;
  place_of_supply: { name: string | null; state_code: string | null } | null;
  totals: {
    subtotal_amount: string;
    item_discount_amount: string;
    bill_discount_amount: string;
    discount_amount: string;
    gst_amount: string;
    total_amount: string;
  };
  items: Array<{
    id?: string;
    variant_id: string | null;
    product_name: string | null;
    sku: string | null;
    hsn_code: string | null;
    uqc_code: string | null;
    unit_label: string | null;
    quantity: number;
    unit_price: string;
    gross_amount: string;
    item_discount_amount: string;
    allocated_bill_discount_amount: string;
    taxable_amount: string;
    gst_rate: string | null;
    cgst_amount: string | null;
    sgst_amount: string | null;
    igst_amount: string | null;
    line_total_amount: string;
  }>;
  footer: string | null;
  payment: {
    status: FinalizedDocumentPaymentStatus;
    paid_amount: string;
    remaining_amount: string;
    modes: string[];
    last_allocation_at: string | null;
    as_of: string;
    allocations: Array<{
      payment_id?: string;
      amount: string;
      payment_mode: string | null;
      reference_note: string | null;
      created_at: string | null;
    }>;
  };
}

export interface Payment {
  id: string;
  customer_id?: string;
  customer?: Customer;
  invoice_id?: string;
  invoice?: {
    id: string;
    invoice_number: string;
    total_amount: number;
    paid_amount?: number;
    status: InvoiceStatus;
  };
  amount: number;
  applied_amount?: number; // Amount actually applied to invoice
  payment_mode: PaymentMode;
  reference_note?: string;
  created_at: string;
}

export interface DashboardStats {
  today_sales: number;
  pending_invoices: number;
  low_stock_items: number;
  total_customers: number;
  supplier_payables: number;
  customer_receivables: number;
  decision_inbox?: DashboardDecisionInbox | null;
}

export interface DashboardDecisionGroup<T> {
  available: boolean;
  records: T[];
}

export interface CustomerCreditDecision {
  type: 'CUSTOMER_CREDIT_DUE';
  priority: number;
  customer_id: string;
  customer_name: string | null;
  due_amount: number;
  reason: { credit_balance: number };
  destination: { kind: 'CUSTOMER'; customer_id: string };
}

export interface LowStockDecision {
  type: 'LOW_STOCK';
  priority: number;
  variant_id: string;
  product_id: string;
  product_name: string | null;
  sku: string | null;
  brand: string | null;
  size: string | null;
  reason: {
    quantity: number;
    low_stock_threshold: number;
    threshold_ratio: number;
  };
  destination: {
    kind: 'PRODUCT_VARIANT';
    product_id: string;
    variant_id: string;
  };
}

export interface HeldBillAttentionDecision {
  type: 'HELD_BILL_ATTENTION';
  priority: number;
  invoice_id: string;
  invoice_number: string | null;
  total_amount: number;
  item_count: number;
  held_at: string;
  lease_state: 'UNCLAIMED' | 'EXPIRED';
  reason: {
    held_at: string;
    held_by: string | null;
    lease_expires_at: string | null;
  };
  destination: { kind: 'HELD_BILL'; invoice_id: string };
}

export interface DashboardDecisionInbox {
  money_to_collect: DashboardDecisionGroup<CustomerCreditDecision>;
  low_stock: DashboardDecisionGroup<LowStockDecision>;
  held_bills: DashboardDecisionGroup<HeldBillAttentionDecision>;
}

// API Response wrappers - Matches backend exactly
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page?: number;
    limit?: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip?: number;
  take?: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// Barcode types
export interface BarcodeInfo {
  id: string;
  barcode: string;
  is_active: boolean;
}

export interface StoreBarcodeInfo extends BarcodeInfo {
  variant_id: string;
  reused: boolean;
}

export interface BarcodeProductData {
  barcode: BarcodeInfo;
  product: Product;
  variant: ProductVariant;
  inventory: Inventory | null;
}

export interface BarcodeScanResponse {
  success: boolean;
  found: boolean;
  data?: BarcodeProductData;
}

export interface BarcodeLookupData {
  name: string | null;
  brand: string | null;
  image_url: string | null;
  quantity: string | null;
  category_hint: string | null;
  barcode: string;
  // Local data fields (only if source is LOCAL)
  product_master_id?: number;
  category_id?: number;
  mrp?: number;
  selling_price?: number;
}

export interface BarcodeLookupResponse {
  success: boolean;
  message: string;
  data: {
    source: 'LOCAL' | 'EXTERNAL' | 'NONE';
    found: boolean;
    data?: BarcodeLookupData;
  };
}

export interface CreateProductFromBarcodeRequest {
  barcode: string;
  productMaster: {
    name: string;
    brand?: string | null;
    categoryName?: string | null;
  };
  product: {
    name: string;
    categoryId?: number | null;
    hsnCode?: string | null;
  };
  variant: {
    sku?: string | null;
    mrp: number;
    sellingPrice: number;
    unit?: string | null;
    unitValue?: number | null;
    imageUrl?: string | null;
    gstPercent?: number | null;
    uqcCode?: UqcCode | null;
    unitLabel?: string | null;
  };
  inventory: {
    quantity: number;
  };
}

export interface BarcodeProductResponse {
  barcode: BarcodeInfo;
  product: Product;
  variant: ProductVariant;
  inventory: Inventory;
}
