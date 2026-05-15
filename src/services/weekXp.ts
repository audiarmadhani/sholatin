/** Monday-start week in local timezone; returns ISO bounds for SQL on created_at_iso. */
export function localMondayWeekBoundsISO(now = new Date()): { startIso: string; endIso: string } {
  const x = new Date(now);
  const day = x.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(x);
  monday.setDate(x.getDate() + offsetToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { startIso: monday.toISOString(), endIso: sunday.toISOString() };
}
