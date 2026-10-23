// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('cashier billing firm isolation', () => {
  it('does not expose firm selection in the cashier billing screen', () => {
    const source = readFileSync(new URL('./BillingPage.tsx', import.meta.url), 'utf8');
    expect(source).not.toContain('useGetFirmsQuery');
    expect(source).not.toContain('selectedFirmId');
    expect(source).not.toContain('firm_id');
  });
});
