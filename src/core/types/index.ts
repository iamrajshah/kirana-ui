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
  is_active: boolean;
  product?: Product;
  inventory?: Inventory;
}

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
}

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'ADJUSTMENT';

export interface Payment {
  id: string;
  customer_id: string;
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
  };
  variant: {
    sku?: string | null;
    mrp: number;
    sellingPrice: number;
    unit?: string | null;
    unitValue?: number | null;
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
