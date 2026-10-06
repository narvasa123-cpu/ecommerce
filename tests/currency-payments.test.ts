import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  updatePayment: vi.fn(),
  order: {
    id: 'order-test',
    total: 20000,
    status: 'PENDING',
    payment: { provider: 'stripe', status: 'PENDING' },
  },
  updateOrder: vi.fn(),
}));
vi.mock('../src/lib/db', () => ({
  db: {
    payment: { update: mocks.updatePayment },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        order: { findUnique: async () => mocks.order, update: mocks.updateOrder },
        payment: { update: mocks.updatePayment },
        cartItem: { deleteMany: vi.fn() },
        cart: { updateMany: vi.fn() },
        auditLog: { create: vi.fn() },
      }),
  },
}));
vi.mock('../src/lib/transaction-lock', () => ({ transactionLock: vi.fn() }));
vi.mock('../src/lib/security', () => ({
  HttpError: class extends Error {},
  appUrl: () => 'https://example.test',
  token: vi.fn(),
}));
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: mocks.createSession } };
  },
}));
import { confirmPayment, stripeCheckout } from '../src/lib/orders';
import { toPhpMinor } from '../src/lib/pricing';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.order.status = 'PENDING';
  mocks.createSession.mockResolvedValue({ id: 'session-test', url: 'https://example.test/pay' });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fake');
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
describe('PHP test payment conversion', () => {
  it('creates a PHP session with the converted amount, not the USD base amount', async () => {
    const order = {
      id: 'order-test',
      email: 'sample@example.test',
      number: 'TEST',
      total: 20000,
      accessToken: 'token',
      idempotencyKey: 'key',
    } as Parameters<typeof stripeCheckout>[0];
    await stripeCheckout(order);
    const session = mocks.createSession.mock.calls[0][0];
    expect(session.metadata.settlementCurrency).toBe('php');
    expect(session.line_items[0].price_data.currency).toBe('php');
    expect(session.line_items[0].price_data.unit_amount).toBe(1252940);
  });
  it('accepts the exact converted total in PHP centavos', async () => {
    await confirmPayment('order-test', 'session-test', toPhpMinor(20000), 'stripe', 'php');
    expect(mocks.updateOrder).toHaveBeenCalledWith({
      where: { id: 'order-test' },
      data: { status: 'PAID', reservationExpiresAt: null },
    });
  });
  it('rejects a dollar-base amount or an incorrect converted amount submitted as PHP', async () => {
    for (const amount of [20000, toPhpMinor(20000) + 1])
      await expect(
        confirmPayment('order-test', 'session-test', amount, 'stripe', 'php'),
      ).rejects.toThrow('Payment verification');
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });
  it('preserves verification of pending legacy USD sessions', async () => {
    await confirmPayment('order-test', 'session-test', 20000, 'stripe', 'usd');
    expect(mocks.updateOrder).toHaveBeenCalledOnce();
  });
});
