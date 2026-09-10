export function formatCurrencyCents(cents: number, currency: string = "USD"): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", { style:"currency", currency, maximumFractionDigits:0 });
}
export function formatCurrencyCentsPrecise(cents: number): string {
  const dollars = cents/100;
  return dollars.toLocaleString("en-US", { style:"currency", currency:"USD", minimumFractionDigits:2 });
}
export function formatNumber(n: number): string { return n.toLocaleString("en-US"); }
export function formatPercent(p: number | null): string {
  if (p===null || !isFinite(p)) return "—";
  const v = p*100;
  const sign = v>0?"+":"";
  return `${sign}${v.toFixed(1)}%`;
}
export function formatDateISO(dateStr: string): string {
  // keep as yyyy-mm-dd but display more friendly: MMM d, yyyy
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric", timeZone:"UTC" });
}
export function formatAov(cents: number | null): string {
  if (cents===null) return "—";
  return formatCurrencyCents(cents);
}
