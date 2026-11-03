import { describe, expect, it } from 'vitest';
import { trialCountdown } from './trialCountdown';

describe('trialCountdown', () => {
  const now = new Date('2026-11-03T10:00:00.000Z').getTime();

  it('shows days and hours for a healthy trial', () => {
    expect(trialCountdown('2026-11-05T14:30:00.000Z', now)).toMatchObject({
      expired: false,
      critical: false,
      days: 2,
      hours: 4,
      minutes: 30,
    });
  });

  it('turns critical during the final five hours', () => {
    expect(trialCountdown('2026-11-03T14:59:00.000Z', now)).toMatchObject({
      expired: false,
      critical: true,
      days: 0,
      hours: 4,
      minutes: 59,
    });
  });

  it('never reports a negative countdown', () => {
    expect(trialCountdown('2026-11-03T09:00:00.000Z', now)).toEqual({
      expired: true,
      critical: false,
      days: 0,
      hours: 0,
      minutes: 0,
    });
  });
});
