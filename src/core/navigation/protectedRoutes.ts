import { ROUTES } from '@core/constants';
import type { TabPermission } from '@core/permissions/rolePermissions';

export type ProtectedPageRouteId =
  | 'customer-ledger'
  | 'product-detail'
  | 'product-barcode'
  | 'supplier-ledger'
  | 'invoice-detail'
  | 'purchase-detail'
  | 'purchase-create';

export interface ProtectedRouteAccess {
  path: string;
  permission: TabPermission;
}

export interface ProtectedPageRouteAccess extends ProtectedRouteAccess {
  id: ProtectedPageRouteId;
}

export const protectedPageRoutes: readonly ProtectedPageRouteAccess[] = [
  { id: 'customer-ledger', path: '/customers/:id/ledger', permission: 'customers' },
  { id: 'product-detail', path: '/products/:id', permission: 'products' },
  { id: 'product-barcode', path: ROUTES.PRODUCT_BARCODE, permission: 'products' },
  { id: 'supplier-ledger', path: '/suppliers/:id/ledger', permission: 'suppliers' },
  { id: 'invoice-detail', path: '/invoices/:id', permission: 'invoices' },
  { id: 'purchase-detail', path: '/purchases/:id', permission: 'purchases' },
  { id: 'purchase-create', path: ROUTES.PURCHASE_CREATE, permission: 'purchases' },
];

export const protectedMainLayoutRoutes: readonly ProtectedRouteAccess[] = [
  { path: ROUTES.DASHBOARD, permission: 'dashboard' },
  { path: ROUTES.BILLING, permission: 'billing' },
  { path: ROUTES.CUSTOMERS, permission: 'customers' },
  { path: ROUTES.SUPPLIERS, permission: 'suppliers' },
  { path: ROUTES.PURCHASES, permission: 'purchases' },
  { path: ROUTES.PRODUCTS, permission: 'products' },
  { path: ROUTES.INVENTORY, permission: 'inventory' },
  { path: ROUTES.INVOICES, permission: 'invoices' },
  { path: ROUTES.PAYMENTS, permission: 'payments' },
  { path: ROUTES.REPORTS, permission: 'reports' },
  { path: ROUTES.USERS, permission: 'users' },
  { path: ROUTES.CATEGORIES, permission: 'products' },
  { path: ROUTES.IMPORT_EXPORT, permission: 'import-export' },
];
