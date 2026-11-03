const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type TrialCountdown = {
  expired: boolean;
  critical: boolean;
  days: number;
  hours: number;
  minutes: number;
};

export const trialCountdown = (expiresAt: string, now = Date.now()): TrialCountdown => {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  return {
    expired: remaining === 0,
    critical: remaining > 0 && remaining <= 5 * HOUR_MS,
    days: Math.floor(remaining / DAY_MS),
    hours: Math.floor((remaining % DAY_MS) / HOUR_MS),
    minutes: Math.floor((remaining % HOUR_MS) / MINUTE_MS),
  };
};

export { MINUTE_MS };
