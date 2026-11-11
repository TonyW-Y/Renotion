import { describe, expect, it } from 'vitest';
import { formatMoney, formatQuantity, parseMoney, perUnit } from './format';

describe('format', () => {
  it('formats CAD', () => {
    expect(formatMoney(1887.3)).toBe('$1,887.30');
  });
  it('parses money input', () => {
    expect(parseMoney('$1,234.567')).toBe(1234.57);
    expect(parseMoney('9.5')).toBe(9.5);
    expect(parseMoney('-1')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });
  it('formats quantities with units', () => {
    expect(formatQuantity(143, 'sqft')).toBe('143 sq ft');
    expect(formatQuantity(1, 'box')).toBe('1 box');
    expect(formatQuantity(6, 'box')).toBe('6 boxes');
    expect(formatQuantity(2, 'each')).toBe('2');
    expect(perUnit('gallon')).toBe('per gal');
  });
});
