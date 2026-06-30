export function formatDateTimeInTimeZone(
  value: string | null | undefined,
  timeZone: string,
  locale = 'es-CL',
): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, { timeZone });
}
