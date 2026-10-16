import { describe, expect, it } from 'vitest';
import { canEditTenantDocumentSettings } from './documentSettingsAccess';

describe('bill settings access', () => {
  it('allows the owner but keeps manager and cashier profiles free of editing controls', () => {
    expect(canEditTenantDocumentSettings(['OWNER'])).toBe(true);
    expect(canEditTenantDocumentSettings(['MANAGER'])).toBe(false);
    expect(canEditTenantDocumentSettings(['CASHIER'])).toBe(false);
  });
});
