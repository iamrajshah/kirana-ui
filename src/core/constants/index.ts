// App Constants

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Kirana POS';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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
  PRODUCTS: '/products',
  INVENTORY: '/inventory',
  PAYMENTS: '/payments',
  PROFILE: '/profile',
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
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
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
