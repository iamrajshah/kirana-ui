import { describe, expect, it } from 'vitest';
import { getGstActivationBlockers } from './documentSettingsValidation';
import type { TenantDocumentSettings } from '@core/types';

const completeSettings: TenantDocumentSettings = {
  id: '1',
  tenant_id: '1',
  document_mode: 'GST_TAX_INVOICE',
  supplier_name: 'Rajesh Kirana',
  address_line1: 'Main Road',
  address_line2: null,
  city: 'Mumbai',
  state: 'Maharashtra',
  state_code: '27',
  postal_code: '400001',
  gstin: '27ABCDE1234F1Z5',
  phone: null,
  footer: null,
  authorized_signatory: 'Rajesh Shah',
  default_paper_width: 'MM80',
  settings_version: 1,
  created_at: null,
  updated_at: null,
  capabilities: {
    receipt_documents_enabled: true,
    supported_paper_widths: ['MM58', 'MM80'],
    per_print_override: true,
  },
};

describe('GST activation blockers', () => {
  it('reports exact missing legal fields while keeping footer optional', () => {
    const blockers = getGstActivationBlockers({
      ...completeSettings,
      supplier_name: null,
      address_line1: null,
      footer: null,
    });

    expect(blockers).toEqual(['supplier_name', 'address_line1']);
  });

  it('requires the GSTIN state prefix to match the supplier state', () => {
    expect(getGstActivationBlockers({ ...completeSettings, state_code: '24' })).toEqual([
      'gstin_state_mismatch',
    ]);
  });

  it('accepts a complete profile without a footer', () => {
    expect(getGstActivationBlockers(completeSettings)).toEqual([]);
  });
});
