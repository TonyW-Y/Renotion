import { describe, expect, it } from 'vitest';
import {
  feetToMetres,
  formatArea,
  formatLength,
  formatScaleLabel,
  niceScaleLength,
  metresToFeet,
  parseLength,
  sqmToSqft,
} from './units';

describe('conversions', () => {
  it('converts feet and metres exactly', () => {
    expect(feetToMetres(8)).toBeCloseTo(2.4384, 10);
    expect(metresToFeet(0.3048)).toBeCloseTo(1, 10);
  });

  it('converts square metres to square feet', () => {
    // 1 m² = 1 / 0.3048² = 10.7639 ft²
    expect(sqmToSqft(1)).toBeCloseTo(10.7639, 4);
  });
});

describe('formatLength', () => {
  it('formats metric with two decimals by default', () => {
    expect(formatLength(2.44, 'metric')).toBe('2.44 m');
    expect(formatLength(0.15, 'metric')).toBe('0.15 m');
    expect(formatLength(3.14159, 'metric', { decimals: 3 })).toBe('3.142 m');
  });

  it('formats exactly 8 feet', () => {
    expect(formatLength(2.4384, 'imperial')).toBe('8′ 0″');
  });

  it('formats a standard wall thickness as fractional inches', () => {
    // 0.15 m = 5.9055″ → nearest 1/8″ = 47/8 = 5 7/8″
    expect(formatLength(0.15, 'imperial')).toBe('5 7/8″');
  });

  it('reduces fractions', () => {
    // 6.5″ → 6 1/2″, not 6 4/8″
    expect(formatLength(6.5 * 0.0254, 'imperial')).toBe('6 1/2″');
  });

  it('formats feet + inches', () => {
    // 3 m = 118.11″ → round to 118 1/8″ = 9′ 10 1/8″
    expect(formatLength(3, 'imperial')).toBe('9′ 10 1/8″');
  });

  it('formats lone fractions and zero', () => {
    expect(formatLength(0.25 * 0.0254, 'imperial')).toBe('1/4″');
    expect(formatLength(0, 'imperial')).toBe('0″');
  });
});

describe('formatArea', () => {
  it('formats metric and imperial areas', () => {
    expect(formatArea(12.5, 'metric')).toBe('12.5 m²');
    // 12.5 m² × 10.7639 = 134.55 ft²
    expect(formatArea(12.5, 'imperial')).toBe('134.5 ft²');
  });
});

describe('parseLength', () => {
  it('parses metric inputs', () => {
    expect(parseLength('2.44', 'metric')).toBe(2.44);
    expect(parseLength('2.44 m', 'imperial')).toBe(2.44);
    expect(parseLength('244cm', 'metric')).toBeCloseTo(2.44, 10);
    expect(parseLength('150 mm', 'metric')).toBeCloseTo(0.15, 10);
  });

  it('parses bare numbers as feet in imperial mode', () => {
    expect(parseLength('8', 'imperial')).toBeCloseTo(2.4384, 10);
  });

  it('parses feet and inches', () => {
    expect(parseLength(`8'`, 'metric')).toBeCloseTo(2.4384, 10);
    expect(parseLength(`8' 6"`, 'metric')).toBeCloseTo(102 * 0.0254, 10);
    expect(parseLength('8ft 6 1/2in', 'metric')).toBeCloseTo(102.5 * 0.0254, 10);
    expect(parseLength('8′ 6″', 'metric')).toBeCloseTo(102 * 0.0254, 10);
    expect(parseLength('5 7/8"', 'metric')).toBeCloseTo(5.875 * 0.0254, 10);
  });

  it('round-trips with formatLength', () => {
    for (const m of [0.15, 0.9, 2.4384, 3.6576]) {
      const parsed = parseLength(formatLength(m, 'imperial'), 'imperial');
      expect(parsed).not.toBeNull();
      expect(Math.abs((parsed ?? 0) - m)).toBeLessThan(0.0254 / 16);
    }
  });

  it('rejects garbage', () => {
    expect(parseLength('', 'metric')).toBeNull();
    expect(parseLength('abc', 'metric')).toBeNull();
    expect(parseLength('5/0"', 'metric')).toBeNull();
  });
});

describe('niceScaleLength', () => {
  it('picks the step closest to the target width', () => {
    // 80 px/m, target 96 px → 1 m (80 px) beats 2 m (160 px)
    expect(niceScaleLength(80, 'metric')).toBe(1);
    // 400 px/m → 0.25 m = 100 px
    expect(niceScaleLength(400, 'metric')).toBe(0.25);
    // 40 px/m → 2 m = 80 px beats 5 m = 200 px
    expect(niceScaleLength(40, 'metric')).toBe(2);
  });

  it('uses round feet in imperial', () => {
    // 80 px/m → 1 ft = 24.4 px, 2 ft = 48.8, 5 ft = 121.9 → 5 ft
    expect(niceScaleLength(80, 'imperial')).toBeCloseTo(feetToMetres(5), 10);
  });
});

describe('formatScaleLabel', () => {
  it('labels metric and imperial lengths', () => {
    expect(formatScaleLabel(1, 'metric')).toBe('1 m');
    expect(formatScaleLabel(0.25, 'metric')).toBe('25 cm');
    expect(formatScaleLabel(feetToMetres(5), 'imperial')).toBe('5 ft');
    expect(formatScaleLabel(feetToMetres(0.5), 'imperial')).toBe('6 in');
  });
});
