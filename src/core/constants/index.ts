// App Constants

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Kirana POS';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://appealing-youthfulness-production-a6ab.up.railway.app/api/v1';

// User Roles
export const ROLES = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
} as const;

// Route Paths
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  BILLING: '/billing',
  CUSTOMERS: '/customers',
  CUSTOMER_DETAIL: '/customers/:id',
  SUPPLIERS: '/suppliers',
  SUPPLIER_LEDGER: '/suppliers/:id/ledger',
  PURCHASES: '/purchases',
  PURCHASE_CREATE: '/purchases/create',
  PRODUCTS: '/products',
  PRODUCT_BARCODE: '/products/barcode/add',
  INVENTORY: '/inventory',
  INVOICES: '/invoices',
  PAYMENTS: '/payments',
  REPORTS: '/reports',
  USERS: '/users',
  CATEGORIES: '/categories',
  IMPORT_EXPORT: '/import-export',
  PROFILE: '/profile',
  CHANGE_PASSWORD: '/change-password',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  LANGUAGE: 'language',
} as const;

// Payment Modes
export const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK', label: 'Bank Transfer' },
] as const;

// Invoice Status
export const INVOICE_STATUS = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL',
} as const;

// Role-based Feature Access
export const ROLE_PERMISSIONS = {
  OWNER: ['dashboard', 'billing', 'customers', 'products', 'inventory', 'payments', 'users'],
  MANAGER: ['dashboard', 'billing', 'customers', 'products', 'inventory', 'payments'],
  CASHIER: ['billing', 'customers', 'payments'],
} as const;
