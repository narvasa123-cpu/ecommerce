import { it, expect } from 'vitest';
import { csvCell } from '../src/lib/admin';
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
