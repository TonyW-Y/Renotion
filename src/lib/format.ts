const cad = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});
const cadWhole = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

/** $1,234.50 */
export const formatMoney = (n: number): string => cad.format(n);
/** $1,235 */
export const formatMoneyWhole = (n: number): string => cadWhole.format(n);

/** Parses "$1,234.50", "1234.5" etc. Returns null if not a non-negative number. */
export function parseMoney(text: string): number | null {
  const n = Number(text.replace(/[$,\s]|CA/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

const UNIT_LABELS: Record<string, [string, string]> = {
  gallon: ['gal', 'gal'],
  sqft: ['sq ft', 'sq ft'],
  sqm: ['m²', 'm²'],
  box: ['box', 'boxes'],
  lft: ['lin ft', 'lin ft'],
  sheet: ['sheet', 'sheets'],
  each: ['', ''],
};

/** "143 sq ft", "6 boxes", "1" */
export function formatQuantity(q: number, unit: string): string {
  const [one, many] = UNIT_LABELS[unit] ?? [unit, unit];
  const label = q === 1 ? one : many;
  return label ? `${q.toLocaleString('en-CA')} ${label}` : q.toLocaleString('en-CA');
}

/** "per sq ft", "per box" */
export const perUnit = (unit: string): string =>
  unit === 'each' ? 'each' : `per ${UNIT_LABELS[unit]?.[0] ?? unit}`;
