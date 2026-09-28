// "2026-09-28T10:00:00.000Z" → "28 Sept 2026" (in the user's locale)
export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
