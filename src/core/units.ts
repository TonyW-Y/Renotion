/**
 * Unit conversion and formatting.
 *
 * All lengths are stored internally in metres. These helpers convert only at
 * the display layer, based on the user's metric/imperial preference.
 */

export type UnitSystem = 'metric' | 'imperial';

export const METRES_PER_FOOT = 0.3048;
export const METRES_PER_INCH = 0.0254;
export const SQFT_PER_SQM = 1 / (METRES_PER_FOOT * METRES_PER_FOOT);

export const metresToFeet = (m: number): number => m / METRES_PER_FOOT;
export const feetToMetres = (ft: number): number => ft * METRES_PER_FOOT;
export const metresToInches = (m: number): number => m / METRES_PER_INCH;
export const inchesToMetres = (inches: number): number => inches * METRES_PER_INCH;
export const sqmToSqft = (sqm: number): number => sqm * SQFT_PER_SQM;
export const sqftToSqm = (sqft: number): number => sqft / SQFT_PER_SQM;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface FormatLengthOptions {
  /** Decimal places for metric output. Default 2. */
  decimals?: number;
  /** Inch fraction denominator for imperial output (power of two). Default 8. */
  fraction?: number;
}

/** Formats a length in metres, e.g. `2.44 m` or `8′ 0″`. */
export function formatLength(
  metres: number,
  units: UnitSystem,
  { decimals = 2, fraction = 8 }: FormatLengthOptions = {},
): string {
  if (units === 'metric') return `${metres.toFixed(decimals)} m`;

  const sign = metres < 0 ? '−' : '';
  const totalUnits = Math.round(metresToInches(Math.abs(metres)) * fraction);
  const feet = Math.floor(totalUnits / (12 * fraction));
  const remainder = totalUnits - feet * 12 * fraction;
  const wholeInches = Math.floor(remainder / fraction);
  const numerator = remainder % fraction;

  let inchText = String(wholeInches);
  if (numerator !== 0) {
    const d = gcd(numerator, fraction);
    const frac = `${numerator / d}/${fraction / d}`;
    inchText = wholeInches === 0 && feet === 0 ? frac : `${wholeInches} ${frac}`;
  }

  return feet > 0 ? `${sign}${feet}′ ${inchText}″` : `${sign}${inchText}″`;
}

/** Formats an area in square metres, e.g. `12.5 m²` or `134.5 ft²`. */
export function formatArea(sqm: number, units: UnitSystem, decimals = 1): string {
  return units === 'metric'
    ? `${sqm.toFixed(decimals)} m²`
    : `${sqmToSqft(sqm).toFixed(decimals)} ft²`;
}

const NUMBER = String.raw`(\d+(?:\.\d+)?)`;
const FRACTION = String.raw`(?:(\d+)\s*\/\s*(\d+))`;

const METRIC_RE = new RegExp(String.raw`^${NUMBER}\s*(m|cm|mm)?$`, 'i');
const IMPERIAL_RE = new RegExp(
  String.raw`^(?:${NUMBER}\s*(?:'|′|ft|feet|foot))?\s*` +
    String.raw`(?:${NUMBER}?\s*${FRACTION}?\s*(?:"|″|in|inch|inches)?)?$`,
  'i',
);

/**
 * Parses user input into metres. Accepts `2.44`, `244 cm`, `8'`, `8' 6"`,
 * `8ft 6 1/2in`, `5 7/8"`. Bare numbers use the given unit system
 * (metres for metric, feet for imperial). Returns `null` if unparseable.
 */
export function parseLength(input: string, units: UnitSystem): number | null {
  const text = input.trim();
  if (text === '') return null;

  const metric = METRIC_RE.exec(text);
  if (metric?.[1] !== undefined) {
    const value = Number(metric[1]);
    const unit = metric[2]?.toLowerCase();
    if (unit === 'cm') return value / 100;
    if (unit === 'mm') return value / 1000;
    if (unit === 'm' || units === 'metric') return value;
    return feetToMetres(value);
  }

  const imp = IMPERIAL_RE.exec(text);
  if (!imp) return null;
  const [, ft, inches, num, den] = imp;
  if (ft === undefined && inches === undefined && num === undefined) return null;
  if (den !== undefined && Number(den) === 0) return null;

  const totalInches =
    (ft ? Number(ft) * 12 : 0) +
    (inches ? Number(inches) : 0) +
    (num && den ? Number(num) / Number(den) : 0);
  return inchesToMetres(totalInches);
}

const METRIC_STEPS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
const IMPERIAL_STEPS_FT = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];

/**
 * Picks a "nice" scale-bar length (in metres) whose on-screen size is as close
 * as possible to `targetPx`, e.g. 1 m, 2 m, 5 ft.
 */
export function niceScaleLength(pxPerMetre: number, units: UnitSystem, targetPx = 96): number {
  const candidates =
    units === 'metric' ? METRIC_STEPS : IMPERIAL_STEPS_FT.map((ft) => feetToMetres(ft));
  let best = candidates[0] ?? 1;
  for (const c of candidates) {
    if (Math.abs(c * pxPerMetre - targetPx) < Math.abs(best * pxPerMetre - targetPx)) best = c;
  }
  return best;
}

/** Short label for a scale-bar length, e.g. `1 m`, `50 cm`, `5 ft`, `6 in`. */
export function formatScaleLabel(metres: number, units: UnitSystem): string {
  if (units === 'metric') {
    return metres < 1 ? `${Math.round(metres * 100)} cm` : `${+metres.toFixed(2)} m`;
  }
  const ft = metresToFeet(metres);
  return ft < 1 ? `${Math.round(ft * 12)} in` : `${+ft.toFixed(2)} ft`;
}
