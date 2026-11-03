export type CommercialPlanCode = 'DEMO' | 'STARTER' | 'PRO' | 'BUSINESS' | 'LEGACY_COMPAT';
export type CommercialState =
  | 'PROVISIONING'
  | 'TRIALING'
  | 'ACTIVE'
  | 'GRACE'
  | 'READ_ONLY'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';
export type CommercialFeatureCode =
  | 'CORE_POS'
  | 'ESSENTIAL_REPORTS'
  | 'ADVANCED_REPORTS'
  | 'IMPORT_CUSTOMER_PRODUCT'
  | 'IMPORT_INVENTORY_CATEGORY_SUPPLIER'
  | 'EXPORT_CSV_SIX_DATASETS'
  | 'EXPORT_EXCEL'
  | 'CUSTOM_BARCODE'
  | 'BACKUP_RESTORE'
  | 'MULTI_FIRM'
  | 'BUSINESS_DOCUMENTS'
  | 'LIVE_MARGIN_PREVIEW'
  | 'CUSTOMER_STOREFRONT';
export type CommercialDenialCode =
  | 'COMMERCIAL_SUSPENDED'
  | 'COMMERCIAL_READ_ONLY'
  | 'COMMERCIAL_TRIAL_EXPIRED'
  | 'COMMERCIAL_ENTITLEMENT_MISSING'
  | 'COMMERCIAL_LIMIT_REACHED'
  | 'COMMERCIAL_ACCESS_STALE'
  | 'COMMERCIAL_PROVISIONING'
  | 'COMMERCIAL_ROLE_DENIED';

export interface CommercialAccessSummary {
  planCode: CommercialPlanCode;
  planLabel?: string;
  state: CommercialState;
  accessStateVersion: string;
  entitlements: readonly CommercialFeatureCode[];
  featureRoles?: Partial<Record<CommercialFeatureCode, readonly string[]>>;
  limits: { staff: number | null; firms: number | null };
  demoExpiresAt: string | null;
  endsAt: string | null;
  graceExpiresAt: string | null;
}

export interface CommercialDenial {
  code: CommercialDenialCode;
  reason: string;
  action: 'UPGRADE' | 'RENEW' | 'CONTACT_SUPPORT' | 'WAIT' | 'REFRESH';
  feature?: CommercialFeatureCode;
  accessStateVersion?: string;
}
