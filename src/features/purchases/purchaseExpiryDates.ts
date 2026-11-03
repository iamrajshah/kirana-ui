export const kolkataCalendarDate = (value = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: 'year' | 'month' | 'day') =>
    parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const addCalendarDays = (date: string, days: number): string => {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(
    value.getUTCDate()
  ).padStart(2, '0')}`;
};

export const canReceiveExpiryDate = (expiryDate: string, now = new Date()): boolean =>
  !expiryDate || expiryDate > kolkataCalendarDate(now);
