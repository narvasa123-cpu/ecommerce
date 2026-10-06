import { describe, it, expect } from 'vitest';
import { priceOrder } from '../src/lib/pricing';
const valid = {
  kind: 'PERCENT',
  value: 10,
  minimum: 20000,
  active: true,
  expiresAt: new Date('2030-01-01'),
  uses: 0,
  usageLimit: 10,
};
describe('Server pricing in integer cents', () => {
  it('computes the complete US standard total', () => {
    expect(priceOrder([{ price: 48500, quantity: 1 }])).toEqual({
      subtotal: 48500,
      discount: 0,
      shipping: 0,
      tax: 3880,
      total: 52380,
    });
  });
  it('uses the discounted subtotal for complimentary delivery', () => {
    expect(priceOrder([{ price: 25000, quantity: 1 }], 'US', 'standard', valid)).toEqual({
      subtotal: 25000,
      discount: 2500,
      shipping: 1200,
      tax: 1800,
      total: 25500,
    });
  });
  it('caps fixed discounts at the subtotal', () => {
    expect(
      priceOrder([{ price: 1000, quantity: 1 }], 'US', 'standard', {
        ...valid,
        kind: 'FIXED',
        value: 5000,
        minimum: 0,
      }).discount,
    ).toBe(1000);
  });
  it('computes EU express delivery and rounded destination tax', () => {
    expect(priceOrder([{ price: 28501, quantity: 1 }], 'FR', 'express').total).toBe(38201);
  });
  it('rejects expired, exhausted, inactive and below-minimum promotions', () => {
    for (const promo of [
      { ...valid, expiresAt: new Date('2000-01-01') },
      { ...valid, uses: 10 },
      { ...valid, active: false },
      { ...valid, minimum: 50000 },
    ])
      expect(() => priceOrder([{ price: 25000, quantity: 1 }], 'US', 'standard', promo)).toThrow();
  });
  it('rejects unsupported regions, delivery and invalid quantities', () => {
    expect(() => priceOrder([{ price: 1000, quantity: 1 }], 'XX')).toThrow();
    expect(() => priceOrder([{ price: 1000, quantity: 1 }], 'US', 'teleport')).toThrow();
    for (const quantity of [0, -1, 1.1, 11])
      expect(() => priceOrder([{ price: 1000, quantity }])).toThrow();
  });
  it('returns zero for an empty bag', () => {
    expect(priceOrder([])).toEqual({ subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 });
  });
});
