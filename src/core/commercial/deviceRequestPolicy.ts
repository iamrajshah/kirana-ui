import type { CommercialAccessSummary, CommercialFeatureCode } from './types';
import { deviceFeatureMode } from './deviceAccess';
// Mirror the API's commercialRouteIntents contract. Account recovery and shopper routes stay outside POS device gating.
export const deviceRequestFeature = (
  rawPath: string,
  method: string
): CommercialFeatureCode | null => {
  const path = rawPath.split('?')[0];
  const read = ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  if (path === '/users/me/profile' || path === '/users/me/password') return null;
  if (path.startsWith('/invoices'))
    return read && !path.startsWith('/invoices/held') ? 'INVOICES' : 'BILLING';
  if (path.startsWith('/purchases/import')) return 'PURCHASE_BILL_IMPORT';
  if (path.startsWith('/inventory/expiry-alerts')) return 'EXPIRY_TRACKING';
  if (path.startsWith('/reports/gst')) return 'GST_CA_REPORTS';
  if (path.startsWith('/tenant-settings') || (path === '/firms' && read))
    return read ? 'BILLING' : 'FIRMS_SETTINGS';
  const prefixes: [string, CommercialFeatureCode][] = [
    ['/dashboard', 'DASHBOARD'],
    ['/users', 'STAFF'],
    ['/customers', 'CUSTOMERS_KHATA'],
    ['/suppliers', 'SUPPLIERS'],
    ['/products', 'PRODUCTS'],
    ['/variants', 'PRODUCTS'],
    ['/categories', 'PRODUCTS'],
    ['/inventory', 'INVENTORY'],
    ['/purchases', 'PURCHASES'],
    ['/payments', 'PAYMENTS'],
    ['/reports', 'REPORTS'],
    ['/import', 'IMPORT_EXPORT'],
    ['/tenant-backup', 'BACKUP_RESTORE'],
    ['/food-licences', 'FOOD_LICENCES'],
    ['/firms', 'FIRMS_SETTINGS'],
    ['/shifts', 'SHIFTS'],
    ['/storefront-offers', 'ONLINE_ORDERS'],
  ];
  return prefixes.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'))?.[1] ?? null;
};
export const deviceRequestBlocked = (
  access: CommercialAccessSummary | null | undefined,
  path: string,
  method: string
): CommercialFeatureCode | null => {
  const feature = deviceRequestFeature(path, method);
  if (!feature) return null;
  const mode = deviceFeatureMode(access, feature);
  return mode === 'HIDDEN' ||
    (mode === 'READ_ONLY' &&
      (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) ||
        path.startsWith('/tenant-backup/export')))
    ? feature
    : null;
};
