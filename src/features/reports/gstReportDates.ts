const localDate = (value: Date): string =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate()
  ).padStart(2, '0')}`;

export const currentLocalMonthRange = (now = new Date()) => ({
  from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
  to: localDate(now),
});

export const currentLocalDate = (): string => localDate(new Date());
