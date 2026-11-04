import { describe, expect, it } from 'vitest';
import { addCalendarDays, canReceiveExpiryDate, kolkataCalendarDate } from './purchaseExpiryDates';

describe('purchase expiry business dates', () => {
  const now = new Date('2026-11-03T19:00:00.000Z'); // 4 Nov in Asia/Kolkata

  it('uses the shop business date rather than UTC', () => {
    expect(kolkataCalendarDate(now)).toBe('2026-11-04');
    expect(kolkataCalendarDate(new Date('2026-11-03T18:30:00.000Z'))).toBe('2026-11-04');
    expect(kolkataCalendarDate(new Date('2026-11-03T23:59:00.000Z'))).toBe('2026-11-04');
  });

  it('treats expiry as the first non-saleable day', () => {
    expect(canReceiveExpiryDate('2026-11-03', now)).toBe(false);
    expect(canReceiveExpiryDate('2026-11-04', now)).toBe(false);
    expect(canReceiveExpiryDate('2026-11-05', now)).toBe(true);
    expect(addCalendarDays(kolkataCalendarDate(now), 1)).toBe('2026-11-05');
  });
});
