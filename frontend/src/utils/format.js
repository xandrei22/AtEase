/**
 * Format a date or ISO date string for display (e.g. "Feb 17, 2026").
 * Avoids raw ISO (2026-02-17T16:00:00.000Z) and 2-digit year ("26").
 */
export function formatDateDisplay(d) {
  if (d == null || d === '') return '';
  const x = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (!(x instanceof Date) || isNaN(x.getTime())) return '';
  return x.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format date and time for display (e.g. "Feb 17, 2026, 4:00 PM").
 */
export function formatDateTimeDisplay(d) {
  if (d == null || d === '') return '';
  const x = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (!(x instanceof Date) || isNaN(x.getTime())) return '';
  return x.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
