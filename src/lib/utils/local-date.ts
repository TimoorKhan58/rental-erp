/**
 * Today's date in the browser's own time zone as "YYYY-MM-DD" (SaaS phase
 * 4a). `new Date().toISOString().slice(0, 10)` gives the UTC date instead,
 * which in Pakistan is still yesterday until 5 am.
 */
export function localDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
