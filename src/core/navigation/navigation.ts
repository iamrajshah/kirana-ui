import {
  home,
  cart,
  people,
  cube,
  cash,
  layers,
  briefcase,
  cardOutline,
  receipt,
  statsChart,
  personAdd,
  swapHorizontal,
  pricetags,
  informationCircleOutline,
  walletOutline,
  timerOutline,
  schoolOutline,
} from 'ionicons/icons';
import { ROUTES } from '@core/constants';
import { hasAccessToTab, type TabPermission } from '@core/permissions/rolePermissions';
import {
  canUseCommercialFeature,
  type CommercialAccessSummary,
  type CommercialFeatureCode,
} from '@core/commercial';

export type NavigationGroup = 'sell' | 'stock' | 'manage' | 'more';

export interface NavigationItem {
  id: string;
  href: string;
  labelKey: string;
  icon: string;
  group: NavigationGroup;
  primary?: boolean;
  permission?: TabPermission;
  commercialFeature?: CommercialFeatureCode;
}

export const navigationItems: readonly NavigationItem[] = [
  {
    id: 'dashboard',
    href: ROUTES.DASHBOARD,
    labelKey: 'dashboard.title',
    icon: home,
    group: 'sell',
    primary: true,
    permission: 'dashboard',
    commercialFeature: 'DASHBOARD',
  },
  {
    id: 'billing',
    href: ROUTES.BILLING,
    labelKey: 'billing.title',
    icon: cart,
    group: 'sell',
    primary: true,
    permission: 'billing',
    commercialFeature: 'BILLING',
  },
  {
    id: 'customers',
    href: ROUTES.CUSTOMERS,
    labelKey: 'customers.title',
    icon: people,
    group: 'sell',
    primary: true,
    permission: 'customers',
    commercialFeature: 'CUSTOMERS_KHATA',
  },
  {
    id: 'invoices',
    href: ROUTES.INVOICES,
    labelKey: 'invoices.title',
    icon: receipt,
    group: 'sell',
    permission: 'invoices',
    commercialFeature: 'INVOICES',
  },
  {
    id: 'storefront-orders',
    href: ROUTES.STOREFRONT_ORDERS,
    labelKey: 'storefrontOrders.title',
    icon: receipt,
    group: 'sell',
    permission: 'invoices',
    commercialFeature: 'ONLINE_ORDERS',
  },
  {
    id: 'payments',
    href: ROUTES.PAYMENTS,
    labelKey: 'payments.title',
    icon: cash,
    group: 'sell',
    primary: true,
    permission: 'payments',
    commercialFeature: 'PAYMENTS',
  },
  {
    id: 'products',
    href: ROUTES.PRODUCTS,
    labelKey: 'products.title',
    icon: cube,
    group: 'stock',
    primary: true,
    permission: 'products',
    commercialFeature: 'PRODUCTS',
  },
  {
    id: 'inventory',
    href: ROUTES.INVENTORY,
    labelKey: 'inventory.title',
    icon: layers,
    group: 'stock',
    permission: 'inventory',
    commercialFeature: 'INVENTORY',
  },
  {
    id: 'categories',
    href: ROUTES.CATEGORIES,
    labelKey: 'workspace.categories',
    icon: pricetags,
    group: 'stock',
    permission: 'products',
    commercialFeature: 'PRODUCTS',
  },
  {
    id: 'suppliers',
    href: ROUTES.SUPPLIERS,
    labelKey: 'suppliers.title',
    icon: briefcase,
    group: 'stock',
    permission: 'suppliers',
    commercialFeature: 'SUPPLIERS',
  },
  {
    id: 'purchases',
    href: ROUTES.PURCHASES,
    labelKey: 'purchases.title',
    icon: cardOutline,
    group: 'stock',
    permission: 'purchases',
    commercialFeature: 'PURCHASES',
  },
  {
    id: 'reports',
    href: ROUTES.REPORTS,
    labelKey: 'reports.title',
    icon: statsChart,
    group: 'manage',
    permission: 'reports',
    commercialFeature: 'REPORTS',
  },
  {
    id: 'users',
    href: ROUTES.USERS,
    labelKey: 'users.title',
    icon: personAdd,
    group: 'manage',
    permission: 'users',
    commercialFeature: 'STAFF',
  },
  {
    id: 'import-export',
    href: ROUTES.IMPORT_EXPORT,
    labelKey: 'importExport.title',
    icon: swapHorizontal,
    group: 'manage',
    permission: 'import-export',
    commercialFeature: 'IMPORT_EXPORT',
  },
  {
    id: 'account',
    href: ROUTES.ACCOUNT,
    labelKey: 'account.title',
    icon: walletOutline,
    group: 'more',
  },
  {
    id: 'shifts',
    href: ROUTES.SHIFTS,
    labelKey: 'shifts.title',
    icon: timerOutline,
    group: 'manage',
    permission: 'shifts',
    commercialFeature: 'SHIFTS',
  },
  {
    id: 'getting-started',
    href: ROUTES.GETTING_STARTED,
    labelKey: 'onboarding.title',
    icon: schoolOutline,
    group: 'more',
  },
  {
    id: 'about',
    href: ROUTES.ABOUT,
    labelKey: 'about.title',
    icon: informationCircleOutline,
    group: 'more',
  },
];

export const getNavigationItems = (roles: string[], access?: CommercialAccessSummary | null) =>
  navigationItems.filter(
    (item) =>
      (!item.permission || hasAccessToTab(roles, item.permission)) &&
      (!item.commercialFeature || canUseCommercialFeature(roles, access, item.commercialFeature))
  );

const primaryTabPrefixes: readonly [prefix: string, tabId: string][] = [
  [ROUTES.DASHBOARD, 'dashboard'],
  [ROUTES.BILLING, 'billing'],
  [ROUTES.INVOICES, 'billing'],
  [ROUTES.CUSTOMERS, 'customers'],
  [ROUTES.PAYMENTS, 'payments'],
  [ROUTES.PRODUCTS, 'products'],
  [ROUTES.INVENTORY, 'products'],
  [ROUTES.CATEGORIES, 'products'],
  [ROUTES.SUPPLIERS, 'products'],
  [ROUTES.PURCHASES, 'products'],
];

export const getPrimaryTabForPath = (pathname: string): string | undefined =>
  primaryTabPrefixes.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )?.[1];
