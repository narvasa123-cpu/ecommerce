import { NextResponse } from 'next/server';
import { requireAdmin, HttpError } from '@/lib/security';
import { db } from '@/lib/db';
import { phpAmount, conversionRounding } from '@/lib/pricing';
import { adminQuery, csvCell, productWhere, orderWhere, inventoryWhere } from '@/lib/admin';
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const section = url.searchParams.get('section');
    const query = adminQuery(Object.fromEntries(url.searchParams));
    let rows: unknown[][] = [];
    if (section === 'orders') {
      const records = await db.order.findMany({
        where: orderWhere(query),
        take: 10001,
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        include: { payment: true },
      });
      if (records.length > 10000)
        throw new HttpError('Please narrow your filters to export 10,000 or fewer records.');
      rows = [
        [
          'Order',
          'Created (UTC)',
          'Email',
          'Status',
          'Payment status',
          'Provider',
          'Subtotal PHP',
          'Discount PHP',
          'Shipping PHP',
          'Tax PHP',
          'Currency rounding PHP',
          'Total PHP',
        ],
        ...records.map((o) => [
          o.number,
          o.createdAt.toISOString(),
          o.email,
          o.status,
          o.payment?.status,
          o.payment?.provider,
          phpAmount(o.subtotal),
          phpAmount(o.discount),
          phpAmount(o.shipping),
          phpAmount(o.tax),
          (conversionRounding(o) / 100).toFixed(2),
          phpAmount(o.total),
        ]),
      ];
    } else if (section === 'products') {
      const records = await db.product.findMany({
        where: productWhere(query),
        take: 10001,
        orderBy:
          query.sort === 'price-asc'
            ? { price: 'asc' }
            : query.sort === 'price-desc'
              ? { price: 'desc' }
              : query.sort === 'newest'
                ? { createdAt: 'desc' }
                : { name: 'asc' },
        include: { collection: true, variants: { include: { inventory: true } } },
      });
      if (records.length > 10000)
        throw new HttpError('Please narrow your filters to export 10,000 or fewer records.');
      rows = [
        ['Product', 'Slug', 'Status', 'Collection', 'Price PHP', 'Variants', 'Available stock'],
        ...records.map((p) => [
          p.name,
          p.slug,
          p.active ? 'Published' : 'Archived',
          p.collection.name,
          phpAmount(p.price),
          p.variants.length,
          p.variants.reduce((s, v) => s + (v.inventory?.quantity || 0), 0),
        ]),
      ];
    } else if (section === 'inventory') {
      const records = await db.variant.findMany({
        where: inventoryWhere(query),
        take: 10001,
        orderBy: { sku: 'asc' },
        include: { product: true, inventory: true },
      });
      if (records.length > 10000)
        throw new HttpError('Please narrow your filters to export 10,000 or fewer records.');
      rows = [
        ['Product', 'SKU', 'Colour', 'Size', 'Available quantity', 'Made to order'],
        ...records.map((v) => [
          v.product.name,
          v.sku,
          v.color,
          v.size,
          v.inventory?.quantity || 0,
          v.madeToOrder,
        ]),
      ];
    } else throw new HttpError('This export is not available.', 404);
    return new Response('\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="orven-' + section + '.csv"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof HttpError ? e.message : 'The export could not be generated. Try again.',
      },
      { status: e instanceof HttpError ? e.status : 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
