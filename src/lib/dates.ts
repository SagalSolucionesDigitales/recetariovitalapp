// Calendar date (YYYY-MM-DD) in the device's own timezone. `toISOString()` gives
// the UTC date, which for Colombia (UTC-5) flips to "tomorrow" from 19:00 local.
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
