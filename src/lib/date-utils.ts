/**
 * Adds N business days (Mon-Fri) to a given date.
 */
export function addBusinessDays(start: Date, days: number): Date {
  let current = new Date(start);
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }
  return current;
}
