import type { TenantDocumentSettings, UpdateTenantDocumentSettings } from '@core/types';

const GST_REQUIRED_FIELDS = [
  'supplier_name',
  'address_line1',
  'city',
  'state',
  'state_code',
  'postal_code',
  'gstin',
  'authorized_signatory',
] as const;

export type GstActivationBlocker = (typeof GST_REQUIRED_FIELDS)[number] | 'gstin_state_mismatch';

export const getGstActivationBlockers = (
  settings: TenantDocumentSettings | UpdateTenantDocumentSettings
): GstActivationBlocker[] => {
  const missing = GST_REQUIRED_FIELDS.filter((field) => !settings[field]?.trim());
  if (
    settings.gstin &&
    settings.state_code &&
    settings.gstin.slice(0, 2) !== settings.state_code
  ) {
    return [...missing, 'gstin_state_mismatch'];
  }
  return missing;
};
