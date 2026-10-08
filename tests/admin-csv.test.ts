import { it, expect } from 'vitest';
import { csvCell, orderStatusHref } from '../src/lib/admin';
it('neutralizes spreadsheet formula cells and preserves quoted customer text', () => {
  for (const input of [
    '=HYPERLINK("https://example.test")',
    ' +SUM(1,2)',
    '@command',
    '\t=1+1',
    '-1+2',
  ])
    expect(csvCell(input)).toMatch(/^"'/);
  expect(csvCell('A "quoted", product')).toBe('"A ""quoted"", product"');
  expect(csvCell('normal@example.test')).toBe('"normal@example.test"');
});

it('builds quick order filters from existing query filters without carrying a stale page', () => {
  const query = { q: 'OR-1042', state: 'PAID', sort: 'oldest', page: 4 };
  expect(orderStatusHref(query)).toBe('/admin/orders?q=OR-1042&sort=oldest');
  expect(orderStatusHref(query, 'unfulfilled')).toBe(
    '/admin/orders?q=OR-1042&sort=oldest&state=unfulfilled',
  );
  expect(orderStatusHref({ ...query, q: '', sort: '' }, 'CANCELLED')).toBe(
    '/admin/orders?state=CANCELLED',
  );
});
