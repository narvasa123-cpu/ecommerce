import { describe, expect, it } from 'vitest';
import { cartAbandonment, salesBreakdowns } from '../src/lib/analytics';

describe('dashboard analytics', () => {
  it('ranks snapshot item value and units and aggregates delivery countries', () => {
    const result = salesBreakdowns(
      [
        {
          cartId: 'a',
          createdAt: new Date(),
          shippingAddress: '{"country":"US"}',
          items: [
            { variantId: 'v1', name: 'Tote', unitPrice: 10000, quantity: 2 },
            { variantId: 'v2', name: 'Wallet', unitPrice: 5000, quantity: 1 },
          ],
        },
        {
          cartId: 'b',
          createdAt: new Date(),
          shippingAddress: 'invalid',
          items: [{ variantId: 'v3', name: 'Tote', unitPrice: 11000, quantity: 1 }],
        },
      ],
      new Map([
        ['v1', 'Bags'],
        ['v2', 'Small goods'],
        ['v3', 'Bags'],
      ]),
    );
    expect(result.products[0]).toEqual({ name: 'Tote', units: 3, value: 31000 });
    expect(result.categories[0]).toEqual({ name: 'Bags', units: 3, value: 31000 });
    expect(result.locations).toEqual(
      expect.arrayContaining([
        { name: 'US', orders: 1 },
        { name: 'Unknown', orders: 1 },
      ]),
    );
  });

  it('deduplicates carts, excludes active carts and counts recovery as conversion', () => {
    const now = new Date('2026-10-06T12:00:00Z');
    const old = new Date('2026-10-04T12:00:00Z');
    const recent = new Date('2026-10-06T11:00:00Z');
    const result = cartAbandonment(
      [
        { entityId: 'abandoned', createdAt: old },
        { entityId: 'active', createdAt: old },
        { entityId: 'active', createdAt: recent },
        { entityId: 'recovered', createdAt: old },
      ],
      [{ cartId: 'recovered', createdAt: recent }],
      now,
    );
    expect(result).toEqual({
      tracked: 3,
      eligible: 2,
      converted: 1,
      abandoned: 1,
      active: 1,
      rate: 50,
    });
  });

  it('handles empty cohorts and the exact 24-hour inactivity boundary', () => {
    expect(cartAbandonment([], [], new Date()).rate).toBeNull();
    const now = new Date('2026-10-06T12:00:00Z');
    const start = new Date('2026-10-05T12:00:00Z');
    expect(
      cartAbandonment(
        [{ entityId: 'a', createdAt: start }],
        [{ cartId: 'a', createdAt: new Date('2026-10-04T00:00:00Z') }],
        now,
      ).rate,
    ).toBe(100);
  });
});
