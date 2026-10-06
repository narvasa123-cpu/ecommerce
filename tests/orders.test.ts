import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key: string, value: string) => jar.set(key, value),
  }),
}));
import { db } from '../src/lib/db';
import { reserveOrder, confirmPayment, cancelOrder, releaseExpired } from '../src/lib/orders';
import { requireAdmin, digest } from '../src/lib/security';
import { POST } from '../src/app/api/store/[...path]/route';
import { getCart } from '../src/lib/cart';
import { GET as exportRecords } from '../src/app/api/admin/export/route';
const address = {
  name: 'Sample Customer',
  line1: '12 Test Lane',
  city: 'New York',
  region: 'NY',
  postalCode: '10001',
  country: 'US',
};
let variantId: string;
beforeAll(async () => {
  const testUrl = new URL(process.env.DATABASE_URL!);
  if (!testUrl.pathname.endsWith('_test'))
    throw new Error('Integration tests require a dedicated database whose name ends in _test.');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DIRECT_URL: process.env.DATABASE_URL },
    stdio: 'pipe',
  });
  const c = await db.collection.upsert({
    where: { slug: 'test' },
    update: {},
    create: {
      slug: 'test',
      name: 'Test',
      description: 'Test collection',
      image: '/images/tote.webp',
    },
  });
  const p = await db.product.upsert({
    where: { slug: 'test-tote' },
    update: {},
    create: {
      slug: 'test-tote',
      name: 'Test Tote',
      description: 'A fictional testing piece',
      material: 'Leather',
      craftsmanship: 'Sample',
      dimensions: '1 cm',
      origin: 'Sample',
      care: 'Sample',
      category: 'Totes',
      price: 30000,
      collectionId: c.id,
      images: { create: { url: '/images/tote.webp', alt: 'Test concept' } },
    },
  });
  const v = await db.variant.upsert({
    where: { sku: 'TEST-SKU' },
    update: {},
    create: {
      sku: 'TEST-SKU',
      productId: p.id,
      color: 'Brown',
      colorHex: '#554433',
      inventory: { create: { quantity: 2 } },
    },
  });
  variantId = v.id;
}, 60000);
beforeEach(async () => {
  jar.clear();
  await db.auditLog.deleteMany();
  await db.stockMovement.deleteMany();
  await db.payment.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.promotion.deleteMany();
  await db.rateLimit.deleteMany();
  await db.session.deleteMany();
  await db.inventory.update({ where: { variantId }, data: { quantity: 2 } });
});
afterAll(() => db.$disconnect());
async function prepare(cartId = 'test-cart', quantity = 1) {
  await db.cart.create({ data: { id: cartId, items: { create: { variantId, quantity } } } });
  return { cartId, key: randomUUID(), email: 'sample@example.test', address, delivery: 'standard' };
}
describe('Database checkout and stock reservations', () => {
  it('serializes concurrent retries for the same checkout', async () => {
    const input = await prepare();
    const orders = await Promise.all([reserveOrder(input), reserveOrder(input)]);
    expect(orders[0].id).toBe(orders[1].id);
    expect(await db.order.count()).toBe(1);
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(1);
  });
  it('does not oversell when two carts reserve the final stock concurrently', async () => {
    const first = await prepare('concurrent-one', 2);
    const second = await prepare('concurrent-two', 2);
    const results = await Promise.allSettled([reserveOrder(first), reserveOrder(second)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.order.count()).toBe(1);
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(0);
  });
  it('restores stock once during concurrent cancellation requests', async () => {
    const order = await reserveOrder(await prepare());
    await Promise.all([
      cancelOrder(order.id, 'First cancellation'),
      cancelOrder(order.id, 'Replay'),
    ]);
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(2);
    expect(await db.auditLog.count({ where: { action: 'RESERVATION_RELEASED' } })).toBe(1);
  });
  it('records payment once during concurrent confirmations', async () => {
    const order = await reserveOrder(await prepare());
    await Promise.all([
      confirmPayment(order.id, 'sandbox-concurrent', order.total, 'sandbox'),
      confirmPayment(order.id, 'sandbox-concurrent', order.total, 'sandbox'),
    ]);
    expect(await db.auditLog.count({ where: { action: 'ORDER_PAID' } })).toBe(1);
    expect((await db.payment.findUniqueOrThrow({ where: { orderId: order.id } })).status).toBe(
      'PAID',
    );
  });
  it('blocks anonymous and customer requests to record exports', async () => {
    const request = () =>
      exportRecords(new Request('http://localhost:3000/api/admin/export?section=orders'));
    expect((await request()).status).toBe(403);
    const user = await db.user.upsert({
      where: { email: 'export-customer@example.test' },
      update: {},
      create: {
        email: 'export-customer@example.test',
        name: 'Customer',
        passwordHash: 'unused',
        role: 'CUSTOMER',
      },
    });
    await db.session.create({
      data: {
        id: digest('export-customer-session'),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    jar.set('orven_session', 'export-customer-session');
    expect((await request()).status).toBe(403);
  });
  it('exports only filtered records to an administrator with private no-store caching', async () => {
    const user = await db.user.upsert({
      where: { email: 'test-admin@example.test' },
      update: {},
      create: {
        email: 'test-admin@example.test',
        name: 'Admin',
        passwordHash: 'unused',
        role: 'ADMIN',
      },
    });
    await db.session.create({
      data: {
        id: digest('export-admin-session'),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    jar.set('orven_session', 'export-admin-session');
    const response = await exportRecords(
      new Request('http://localhost:3000/api/admin/export?section=products&q=TEST-SKU'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toContain('Test Tote');
    const empty = await exportRecords(
      new Request(
        'http://localhost:3000/api/admin/export?section=products&q=missing-export-record',
      ),
    );
    expect((await empty.text()).split('\r\n')).toHaveLength(1);
    expect(
      (await exportRecords(new Request('http://localhost:3000/api/admin/export?section=users')))
        .status,
    ).toBe(404);
  });
  it('ignores client totals and exposes a resumable pending checkout', async () => {
    const input = await prepare();
    jar.set('orven_cart', input.cartId);
    jar.set('orven_csrf', 'csrf-test');
    const request = (path: string, data: unknown) =>
      POST(
        new Request('http://localhost:3000/api/store/' + path, {
          method: 'POST',
          headers: {
            origin: 'http://localhost:3000',
            'x-csrf-token': 'csrf-test',
            'content-type': 'application/json',
          },
          body: JSON.stringify(data),
        }),
        { params: Promise.resolve({ path: path.split('/') }) },
      );
    const response = await request('checkout', { ...input, total: 1, subtotal: 1 });
    expect(response.status).toBe(200);
    const { token } = (await response.json()) as { token: string };
    const order = await db.order.findUniqueOrThrow({ where: { accessToken: token } });
    expect(order.total).toBe(32400);
    expect((await getCart()).pendingOrder?.token).toBe(token);
    expect((await request('checkout/cancel', { token })).status).toBe(200);
    expect((await getCart()).pendingOrder).toBeNull();
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(2);
  });
  it('reserves stock and takes prices from the catalogue', async () => {
    const input = await prepare();
    const order = await reserveOrder(input);
    expect(order.total).toBe(32400);
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(1);
    expect(order.status).toBe('PENDING');
    expect(order.payment?.status).toBe('PENDING');
  });
  it('returns the same order for retries without decrementing again', async () => {
    const input = await prepare();
    const first = await reserveOrder(input);
    const second = await reserveOrder(input);
    expect(first.id).toBe(second.id);
    expect(await db.order.count()).toBe(1);
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(1);
  });
  it('prevents a new idempotency key from creating a second pending order in the same bag', async () => {
    const input = await prepare();
    await reserveOrder(input);
    await expect(reserveOrder({ ...input, key: randomUUID() })).rejects.toThrow(
      'already in progress',
    );
  });
  it('prevents overselling across carts and rolls back the losing order', async () => {
    const first = await prepare('one', 2);
    const second = await prepare('two', 1);
    await reserveOrder(first);
    await expect(reserveOrder(second)).rejects.toThrow('no longer has');
    expect(await db.order.count()).toBe(1);
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(0);
  });
  it('releases stock on payment failure only once', async () => {
    const o = await reserveOrder(await prepare());
    await cancelOrder(o.id, 'Simulated failure');
    await cancelOrder(o.id, 'Replay');
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(2);
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('CANCELLED');
  });
  it('releases expired stock and promotion reservations', async () => {
    await db.promotion.create({
      data: {
        code: 'TEST10',
        kind: 'PERCENT',
        value: 10,
        minimum: 0,
        expiresAt: new Date('2030-01-01'),
        usageLimit: 1,
      },
    });
    const input = await prepare();
    await db.cart.update({ where: { id: input.cartId }, data: { promotionCode: 'TEST10' } });
    const o = await reserveOrder(input);
    expect((await db.promotion.findUniqueOrThrow({ where: { code: 'TEST10' } })).uses).toBe(1);
    await db.order.update({
      where: { id: o.id },
      data: { reservationExpiresAt: new Date(Date.now() - 1000) },
    });
    expect(await releaseExpired()).toBe(1);
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(2);
    expect((await db.promotion.findUniqueOrThrow({ where: { code: 'TEST10' } })).uses).toBe(0);
  });
  it('confirms a simulated payment idempotently and empties the bag', async () => {
    const o = await reserveOrder(await prepare());
    await confirmPayment(o.id, 'sandbox-test', o.total, 'sandbox');
    await confirmPayment(o.id, 'sandbox-test', o.total, 'sandbox');
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('PAID');
    expect(await db.cartItem.count()).toBe(0);
    expect(await db.auditLog.count({ where: { action: 'ORDER_PAID' } })).toBe(1);
  });
  it('rejects mismatched provider or amount', async () => {
    const o = await reserveOrder(await prepare());
    await expect(confirmPayment(o.id, 'wrong', o.total, 'stripe')).rejects.toThrow('verification');
    await expect(confirmPayment(o.id, 'wrong', 1, 'sandbox')).rejects.toThrow('verification');
  });
  it('rejects cross-cart reuse of an idempotency key', async () => {
    const input = await prepare();
    await reserveOrder(input);
    await expect(reserveOrder({ ...input, cartId: 'somebody-else' })).rejects.toThrow(
      'another session',
    );
  });
  it('denies anonymous admin access', async () => {
    await expect(requireAdmin()).rejects.toThrow('Administrator access');
  });
  it('rejects a customer session on admin mutations', async () => {
    const user = await db.user.upsert({
      where: { email: 'test-customer@example.test' },
      update: {},
      create: {
        email: 'test-customer@example.test',
        name: 'Customer',
        passwordHash: 'unused',
        role: 'CUSTOMER',
      },
    });
    await db.session.create({
      data: {
        id: digest('customer-session'),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    jar.set('orven_session', 'customer-session');
    jar.set('orven_csrf', 'csrf-test');
    const response = await POST(
      new Request('http://localhost:3000/api/store/admin/inventory', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': 'csrf-test',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ variantId, delta: 5, reason: 'Test adjustment' }),
      }),
      { params: Promise.resolve({ path: ['admin', 'inventory'] }) },
    );
    expect(response.status).toBe(403);
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(2);
  });
  it('allows an administrator inventory adjustment and records the actor', async () => {
    const user = await db.user.upsert({
      where: { email: 'test-admin@example.test' },
      update: {},
      create: {
        email: 'test-admin@example.test',
        name: 'Admin',
        passwordHash: 'unused',
        role: 'ADMIN',
      },
    });
    await db.session.create({
      data: {
        id: digest('admin-session'),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    jar.set('orven_session', 'admin-session');
    jar.set('orven_csrf', 'csrf-test');
    const response = await POST(
      new Request('http://localhost:3000/api/store/admin/inventory', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': 'csrf-test',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ variantId, delta: 5, reason: 'Stock received for test' }),
      }),
      { params: Promise.resolve({ path: ['admin', 'inventory'] }) },
    );
    expect(response.status).toBe(200);
    expect((await db.inventory.findUniqueOrThrow({ where: { variantId } })).quantity).toBe(7);
    expect(
      await db.auditLog.count({ where: { actorId: user.id, action: 'INVENTORY_ADJUSTED' } }),
    ).toBe(1);
  });
  it('rejects a cross-origin request before any mutation', async () => {
    jar.set('orven_csrf', 'csrf-test');
    const response = await POST(
      new Request('http://localhost:3000/api/store/admin/inventory', {
        method: 'POST',
        headers: {
          origin: 'https://other.example',
          'x-csrf-token': 'csrf-test',
          'content-type': 'application/json',
        },
        body: '{}',
      }),
      { params: Promise.resolve({ path: ['admin', 'inventory'] }) },
    );
    expect(response.status).toBe(403);
  });
});
