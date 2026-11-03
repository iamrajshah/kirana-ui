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
  | 'purchase-create'
  | 'purchase-import'
  | 'expiry-alerts'
  | 'gst-reports';

export interface ProtectedRouteAccess {
  path: string;
  permission: TabPermission;
  commercialFeature?: CommercialFeatureCode;
}

export interface ProtectedPageRouteAccess extends ProtectedRouteAccess {
  id: ProtectedPageRouteId;
}

export const protectedPageRoutes: readonly ProtectedPageRouteAccess[] = [
  {
    id: 'customer-ledger',
    path: '/customers/:id/ledger',
    permission: 'customers',
    commercialFeature: 'CUSTOMERS_KHATA',
  },
  {
    id: 'product-detail',
    path: '/products/:id',
    permission: 'products',
    commercialFeature: 'PRODUCTS',
  },
  {
    id: 'product-barcode',
    path: ROUTES.PRODUCT_BARCODE,
    permission: 'products',
    commercialFeature: 'CUSTOM_BARCODE',
  },
  {
    id: 'supplier-ledger',
    path: '/suppliers/:id/ledger',
    permission: 'suppliers',
    commercialFeature: 'SUPPLIERS',
  },
  {
    id: 'invoice-detail',
    path: '/invoices/:id',
    permission: 'invoices',
    commercialFeature: 'INVOICES',
  },
  {
    id: 'purchase-create',
    path: ROUTES.PURCHASE_CREATE,
    permission: 'purchases',
    commercialFeature: 'PURCHASES',
  },
  {
    id: 'purchase-detail',
    path: '/purchases/:id(\\d+)',
    permission: 'purchases',
    commercialFeature: 'PURCHASES',
  },
  {
    id: 'purchase-import',
    path: ROUTES.PURCHASE_IMPORT,
    permission: 'purchases',
    commercialFeature: 'PURCHASE_BILL_IMPORT',
  },
  {
    id: 'expiry-alerts',
    path: ROUTES.EXPIRY_ALERTS,
    permission: 'inventory',
    commercialFeature: 'EXPIRY_TRACKING',
  },
  {
    id: 'gst-reports',
    path: ROUTES.GST_REPORTS,
    permission: 'reports',
    commercialFeature: 'GST_CA_REPORTS',
  },
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
  'storefront-orders',
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
