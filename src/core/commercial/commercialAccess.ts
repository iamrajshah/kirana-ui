import type {
  CommercialAccessSummary,
  CommercialDenial,
  CommercialFeatureCode,
  CommercialPlanCode,
} from './types';
import en from '@core/i18n/locales/en.json';
import gu from '@core/i18n/locales/gu.json';
import hi from '@core/i18n/locales/hi.json';
import mr from '@core/i18n/locales/mr.json';

export const PLAN_LABELS: Record<CommercialPlanCode, string> = {
  DEMO: 'Demo',
  STARTER: 'Starter',
  PRO: 'Pro',
  BUSINESS: 'Business',
  LEGACY_COMPAT: 'Kirana',
};

const FEATURE_ROLES: Partial<Record<CommercialFeatureCode, readonly string[]>> = {
  CUSTOM_BARCODE: ['OWNER', 'MANAGER'],
  ADVANCED_REPORTS: ['OWNER', 'MANAGER'],
  ESSENTIAL_REPORTS: ['OWNER', 'MANAGER'],
  IMPORT_CUSTOMER_PRODUCT: ['OWNER', 'MANAGER'],
  IMPORT_INVENTORY_CATEGORY_SUPPLIER: ['OWNER', 'MANAGER'],
  EXPORT_CSV_SIX_DATASETS: ['OWNER', 'MANAGER'],
  EXPORT_EXCEL: ['OWNER', 'MANAGER'],
  BACKUP_RESTORE: ['OWNER'],
  MULTI_FIRM: ['OWNER'],
};

export const canUseCommercialFeature = (
  roles: string[],
  access: CommercialAccessSummary | null | undefined,
  feature: CommercialFeatureCode
): boolean => {
  if (!access) return true;
  if (access.planCode === 'LEGACY_COMPAT') return true;
  if (['SUSPENDED', 'CANCELLED', 'EXPIRED', 'PROVISIONING'].includes(access.state)) return false;
  const allowedRoles = FEATURE_ROLES[feature];
  return (
    (!allowedRoles || allowedRoles.some((role) => roles.includes(role))) &&
    access.entitlements.includes(feature)
  );
};

const denialMessageKeys: Record<CommercialDenial['code'], string> = {
  COMMERCIAL_SUSPENDED: 'commercial.suspended',
  COMMERCIAL_READ_ONLY: 'commercial.readOnly',
  COMMERCIAL_TRIAL_EXPIRED: 'commercial.expired',
  COMMERCIAL_ENTITLEMENT_MISSING: 'commercial.upgrade',
  COMMERCIAL_LIMIT_REACHED: 'commercial.limit',
  COMMERCIAL_ACCESS_STALE: 'commercial.stale',
  COMMERCIAL_PROVISIONING: 'commercial.provisioning',
  COMMERCIAL_ROLE_DENIED: 'commercial.roleDenied',
};

const commercialMessages = {
  en: en.commercial,
  gu: gu.commercial,
  hi: hi.commercial,
  mr: mr.commercial,
};

export const commercialDenialMessage = (denial: CommercialDenial): string => {
  const language = (localStorage.getItem('i18nextLng') || 'en').split('-')[0];
  const messages = commercialMessages[language as keyof typeof commercialMessages] ?? en.commercial;
  const key = denialMessageKeys[denial.code].split('.')[1] as keyof typeof en.commercial;
  return messages[key] ?? denial.reason;
};

export const isCommercialDenial = (value: unknown): value is CommercialDenial =>
  Boolean(
    value &&
    typeof value === 'object' &&
    'code' in value &&
    typeof value.code === 'string' &&
    value.code.startsWith('COMMERCIAL_')
  );
