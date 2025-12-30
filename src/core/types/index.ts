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
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  price: number;
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
  variant_id: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  total_amount: number;
  gst_amount: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
  invoice_url?: string;
  created_at: string;
  items?: InvoiceItem[];
}

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'CHEQUE' | 'BANK_TRANSFER';

export interface Payment {
  id: string;
  customer_id: string;
  customer?: Customer;
  invoice_id?: string;
  invoice?: Invoice;
  amount: number;
  payment_mode: PaymentMode;
  reference_note?: string;
  created_at: string;
}

export interface DashboardStats {
  today_sales: number;
  pending_invoices: number;
  low_stock_items: number;
  total_customers: number;
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
