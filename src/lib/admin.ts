import type { Prisma } from '@prisma/client';
export type AdminParams = Record<string, string | string[] | undefined>;
export function adminQuery(params: AdminParams) {
  const value = (key: string) =>
    typeof params[key] === 'string' ? (params[key] as string).trim() : '';
  return {
    q: value('q').slice(0, 100),
    state: value('state'),
    sort: value('sort'),
    page: Math.min(100000, Math.max(1, Number.parseInt(value('page')) || 1)),
  };
}
export type AdminQuery = ReturnType<typeof adminQuery>;
export function orderStatusHref(query: AdminQuery, state = '') {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.sort) params.set('sort', query.sort);
  if (state) params.set('state', state);
  const search = params.toString();
  return '/admin/orders' + (search ? '?' + search : '');
}
export const pageSize = 12;
export function pagination(total: number, requested: number) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requested, pages);
  return { page, pages, skip: (page - 1) * pageSize, take: pageSize };
}
export function productWhere({ q, state }: AdminQuery): Prisma.ProductWhereInput {
  return {
    ...(state === 'active' ? { active: true } : state === 'archived' ? { active: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { variants: { some: { sku: { contains: q } } } },
            { collection: { name: { contains: q } } },
          ],
        }
      : {}),
  };
}
export function orderWhere({ q, state }: AdminQuery): Prisma.OrderWhereInput {
  const statuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED'];
  return {
    ...(statuses.includes(state)
      ? { status: state }
      : state === 'unfulfilled'
        ? { status: { in: ['PAID', 'PROCESSING'] }, payment: { status: 'PAID' } }
        : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: 'insensitive' } },
            { number: { contains: q } },
            { email: { contains: q } },
            { user: { name: { contains: q } } },
            { items: { some: { name: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };
}
export function inventoryWhere({ q, state }: AdminQuery): Prisma.VariantWhereInput {
  return {
    ...(q
      ? {
          OR: [
            { sku: { contains: q } },
            { color: { contains: q } },
            { product: { name: { contains: q } } },
          ],
        }
      : {}),
    ...(state === 'low'
      ? { inventory: { quantity: { lte: 3 } }, product: { active: true } }
      : state === 'out'
        ? { inventory: { quantity: 0 } }
        : state === 'available'
          ? { inventory: { quantity: { gt: 3 } } }
          : {}),
  };
}
export function dateLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export function statusLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());
}
export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return '"' + (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
}
