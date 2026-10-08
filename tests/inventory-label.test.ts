import { it, expect } from 'vitest';
import { lowStockLabel } from '../src/lib/inventory-label';

it('shows an actual low-stock count only for available made-to-stock inventory', () => {
  expect(lowStockLabel(1)).toBe('Low stock · 1 left');
  expect(lowStockLabel(3)).toBe('Low stock · 3 left');
  expect(lowStockLabel(0)).toBeNull();
  expect(lowStockLabel(4)).toBeNull();
  expect(lowStockLabel(2, true)).toBeNull();
});
