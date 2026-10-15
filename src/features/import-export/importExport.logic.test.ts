import { describe, expect, it } from 'vitest';
import type { ImportJob } from '@core/api/importExportApi';
import {
  canCommitImportJob,
  filterImportJobsByType,
  hasActiveImportJobs,
} from './importExport.logic';

const job = (overrides: Partial<ImportJob> = {}): ImportJob => ({
  id: '17',
  type: 'CUSTOMER',
  status: 'COMPLETED',
  file_url: 'customers.csv',
  created_at: '2026-10-15T10:00:00.000Z',
  row_counts: { total: 2, pending: 0, valid: 2, invalid: 0, imported: 0 },
  ...overrides,
});

describe('Import/Export workflow', () => {
  it('matches the singular import types used by the API', () => {
    const jobs = [job(), job({ id: '18', type: 'PRODUCT' })];

    expect(filterImportJobsByType(jobs, 'CUSTOMER').map(({ id }) => id)).toEqual(['17']);
    expect(filterImportJobsByType(jobs, 'PRODUCT').map(({ id }) => id)).toEqual(['18']);
  });

  it('offers commit only after validation completes with valid rows', () => {
    expect(canCommitImportJob(job())).toBe(true);
    expect(canCommitImportJob(job({ status: 'PROCESSING' }))).toBe(false);
    expect(
      canCommitImportJob(
        job({ row_counts: { total: 2, pending: 0, valid: 0, invalid: 2, imported: 0 } })
      )
    ).toBe(false);
  });

  it('polls only while a background import is active', () => {
    expect(hasActiveImportJobs([job({ status: 'PROCESSING' })])).toBe(true);
    expect(hasActiveImportJobs([job()])).toBe(false);
  });
});
