import { describe, expect, it } from 'vitest';
import {
  canRestoreBackup,
  isSupportedBackupFile,
  TENANT_BACKUP_MAX_BYTES,
} from './tenantBackup.logic';

describe('tenant backup restore confirmation', () => {
  it('requires the exact shop name and explicit acknowledgement', () => {
    expect(canRestoreBackup('Demo Shop', 'Demo Shop', false)).toBe(false);
    expect(canRestoreBackup('Demo Shop', 'demo shop', true)).toBe(false);
    expect(canRestoreBackup('Demo Shop', ' Demo Shop ', true)).toBe(true);
  });

  it('accepts only JSON files within the restore limit', () => {
    expect(isSupportedBackupFile({ name: 'shop.json', size: TENANT_BACKUP_MAX_BYTES })).toBe(true);
    expect(isSupportedBackupFile({ name: 'shop.csv', size: 10 })).toBe(false);
    expect(isSupportedBackupFile({ name: 'shop.json', size: TENANT_BACKUP_MAX_BYTES + 1 })).toBe(
      false
    );
  });
});
