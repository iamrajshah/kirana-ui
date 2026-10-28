import { ROUTES } from '@core/constants';
import type { TabPermission } from '@core/permissions/rolePermissions';
import type { CommercialFeatureCode } from '@core/commercial';
import { navigationItems } from './navigation';

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
  commercialFeature?: CommercialFeatureCode;
}

export interface ProtectedPageRouteAccess extends ProtectedRouteAccess {
  id: ProtectedPageRouteId;
}

export const protectedPageRoutes: readonly ProtectedPageRouteAccess[] = [
  { id: 'customer-ledger', path: '/customers/:id/ledger', permission: 'customers' },
  { id: 'product-detail', path: '/products/:id', permission: 'products' },
  {
    id: 'product-barcode',
    path: ROUTES.PRODUCT_BARCODE,
    permission: 'products',
    commercialFeature: 'CUSTOM_BARCODE',
  },
  { id: 'supplier-ledger', path: '/suppliers/:id/ledger', permission: 'suppliers' },
  { id: 'invoice-detail', path: '/invoices/:id', permission: 'invoices' },
  { id: 'purchase-create', path: ROUTES.PURCHASE_CREATE, permission: 'purchases' },
  { id: 'purchase-detail', path: '/purchases/:id(\\d+)', permission: 'purchases' },
];

const mainLayoutRouteIds = [
  'dashboard',
  'billing',
  'customers',
  'suppliers',
  'purchases',
  'products',
  'inventory',
  'invoices',
  'payments',
  'reports',
  'users',
  'categories',
  'import-export',
  'shifts',
] as const;

export const protectedMainLayoutRoutes: readonly ProtectedRouteAccess[] = mainLayoutRouteIds.map(
  (id) => {
    const item = navigationItems.find((candidate) => candidate.id === id);
    if (!item?.permission) throw new Error(`Missing protected navigation route: ${id}`);
    return {
      path: item.href,
      permission: item.permission,
      commercialFeature: item.commercialFeature,
    };
  }
);

export const mainLayoutPaths: readonly string[] = [
  ROUTES.PROFILE,
  ROUTES.CHANGE_PASSWORD,
  ROUTES.ABOUT,
  ROUTES.ACCOUNT,
  ROUTES.ACCOUNT_RENEWAL,
  ROUTES.GETTING_STARTED,
  ROUTES.RESTRICTED,
  ...protectedPageRoutes.map(({ path }) => path),
  ...protectedMainLayoutRoutes.map(({ path }) => path),
];
