import { db } from './db';
import { priceOrder } from './pricing';
import { HttpError, token, appUrl } from './security';
import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
export const sandboxMode = () => process.env.PAYMENT_MODE !== 'stripe';
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_test_'))
    throw new HttpError(
      'Stripe test mode is not configured. Ask the store administrator to complete payment setup.',
      503,
    );
  return new Stripe(key);
}
async function release(tx: Prisma.TransactionClient, id: string, reason: string) {
  const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.status !== 'PENDING') return;
  await tx.order.update({
    where: { id },
    data: { status: 'CANCELLED', reservationExpiresAt: null },
  });
  for (const item of order.items) {
    await tx.inventory.update({
      where: { variantId: item.variantId },
      data: { quantity: { increment: item.quantity } },
    });
    await tx.stockMovement.create({
      data: { variantId: item.variantId, delta: item.quantity, reason },
    });
  }
  if (order.promotionCode)
    await tx.promotion.update({
      where: { code: order.promotionCode },
      data: { uses: { decrement: 1 } },
    });
  await tx.payment.update({ where: { orderId: id }, data: { status: 'FAILED' } });
  await tx.auditLog.create({
    data: { actorId: 'system', action: 'RESERVATION_RELEASED', entityId: id, detail: reason },
  });
}
export async function releaseExpired() {
  // Reconcile provider state before releasing a Stripe reservation. A delayed
  // webhook must not allow paid stock to be offered to a different customer.
  const stripeOrders = await db.order.findMany({
    where: {
      status: 'PENDING',
      reservationExpiresAt: { lte: new Date() },
      payment: { provider: 'stripe' },
    },
    include: { payment: true },
  });
  const releasable: string[] = [];
  for (const o of stripeOrders) {
    if (!o.payment?.providerId) {
      releasable.push(o.id);
      continue;
    }
    try {
      const stripe = stripeClient();
      let session = await stripe.checkout.sessions.retrieve(o.payment.providerId);
      if (session.status === 'open') session = await stripe.checkout.sessions.expire(session.id);
      if (session.payment_status === 'paid' && !session.livemode && session.currency === 'usd')
        await confirmPayment(o.id, session.id, session.amount_total || 0, 'stripe');
      else if (session.status === 'expired') releasable.push(o.id);
    } catch (e) {
      console.error('Reservation reconciliation deferred; retaining stock', o.number, e);
    }
  }
  return db.$transaction(async (tx) => {
    const orders = await tx.order.findMany({
      where: {
        status: 'PENDING',
        reservationExpiresAt: { lte: new Date() },
        OR: [{ payment: { provider: 'sandbox' } }, { id: { in: releasable } }],
      },
    });
    for (const o of orders) await release(tx, o.id, 'Payment reservation expired');
    return orders.length;
  });
}
export async function cancelOrder(id: string, reason: string) {
  const order = await db.order.findUnique({ where: { id }, include: { payment: true } });
  if (
    order?.status === 'PENDING' &&
    order.payment?.provider === 'stripe' &&
    order.payment.providerId
  ) {
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(order.payment.providerId);
    if (session.payment_status === 'paid')
      throw new HttpError('Payment is already confirmed by Stripe. Refresh the order status.', 409);
    if (session.status === 'open') await stripe.checkout.sessions.expire(session.id);
    else if (session.status !== 'expired')
      throw new HttpError('Payment is being processed. Please refresh the order later.', 409);
  }
  await db.$transaction((tx) => release(tx, id, reason));
}
export type Shipping = {
  name: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};
export async function reserveOrder(input: {
  cartId: string;
  key: string;
  email: string;
  address: Shipping;
  delivery: string;
  userId?: string;
}) {
  await releaseExpired();
  return db.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { idempotencyKey: input.key },
      include: { payment: true, items: true },
    });
    if (existing) {
      if (existing.cartId !== input.cartId)
        throw new HttpError('This checkout belongs to another session.', 403);
      return existing;
    }
    const pending = await tx.order.findFirst({
      where: { cartId: input.cartId, status: 'PENDING' },
    });
    if (pending)
      throw new HttpError(
        'A payment is already in progress. Resume it from your bag or cancel it before starting again.',
        409,
      );
    const cart = await tx.cart.findUnique({
      where: { id: input.cartId },
      include: {
        items: {
          include: {
            variant: { include: { inventory: true, product: { include: { images: true } } } },
          },
        },
      },
    });
    if (!cart?.items.length)
      throw new HttpError('Your bag is empty. Choose a piece before checking out.');
    const promotion = cart.promotionCode
      ? await tx.promotion.findUnique({ where: { code: cart.promotionCode } })
      : null;
    if (cart.promotionCode && !promotion)
      throw new HttpError('This promotion is unavailable. Remove it and try again.');
    const totals = priceOrder(
      cart.items.map((i) => ({ price: i.variant.product.price, quantity: i.quantity })),
      input.address.country,
      input.delivery,
      promotion,
    );
    for (const item of cart.items) {
      if (!item.variant.product.active)
        throw new HttpError(item.variant.product.name + ' is no longer available.');
      const changed = await tx.inventory.updateMany({
        where: { variantId: item.variantId, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } },
      });
      if (changed.count !== 1)
        throw new HttpError(
          item.variant.product.name +
            ' no longer has that quantity available. Please update your bag.',
          409,
        );
      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          delta: -item.quantity,
          reason: 'Checkout reservation ' + input.key,
        },
      });
    }
    if (promotion) {
      const changed = await tx.promotion.updateMany({
        where: { id: promotion.id, uses: { lt: promotion.usageLimit } },
        data: { uses: { increment: 1 } },
      });
      if (!changed.count) throw new HttpError('This promotion has reached its usage limit.');
    }
    const accessToken = token();
    const order = await tx.order.create({
      data: {
        number:
          'ORV-' +
          Date.now().toString(36).toUpperCase() +
          '-' +
          accessToken.slice(0, 4).toUpperCase(),
        accessToken,
        idempotencyKey: input.key,
        cartId: input.cartId,
        userId: input.userId,
        email: input.email,
        shippingAddress: JSON.stringify(input.address),
        delivery: input.delivery,
        ...totals,
        promotionCode: cart.promotionCode,
        reservationExpiresAt: new Date(Date.now() + 31 * 60000),
        items: {
          create: cart.items.map((i) => ({
            variantId: i.variantId,
            name: i.variant.product.name,
            variant: i.variant.color + ' / ' + i.variant.size,
            image: i.variant.product.images[0]?.url || '/images/tote.webp',
            unitPrice: i.variant.product.price,
            quantity: i.quantity,
          })),
        },
        payment: {
          create: { provider: sandboxMode() ? 'sandbox' : 'stripe', amount: totals.total },
        },
      },
      include: { payment: true, items: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: input.userId || 'guest',
        action: 'ORDER_RESERVED',
        entityId: order.id,
        detail: order.number,
      },
    });
    return order;
  });
}
export async function confirmPayment(
  id: string,
  providerId: string,
  amount: number,
  provider: 'sandbox' | 'stripe',
) {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { payment: true } });
    if (!order) throw new HttpError('Order not found.', 404);
    if (order.payment?.provider !== provider || order.total !== amount)
      throw new HttpError('Payment verification did not match the order.', 400);
    if (order.status !== 'PENDING') {
      if (order.payment?.status === 'PAID') return null;
      throw new HttpError('The reservation has ended. Please start a new checkout.', 409);
    }
    if (
      provider === 'sandbox' &&
      order.reservationExpiresAt &&
      order.reservationExpiresAt <= new Date()
    )
      throw new HttpError('The reservation has expired. Please return to your bag.', 409);
    await tx.order.update({ where: { id }, data: { status: 'PAID', reservationExpiresAt: null } });
    await tx.payment.update({ where: { orderId: id }, data: { status: 'PAID', providerId } });
    await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
    await tx.cart.updateMany({ where: { id: order.cartId }, data: { promotionCode: null } });
    await tx.auditLog.create({
      data: {
        actorId: provider,
        action: 'ORDER_PAID',
        entityId: id,
        detail:
          provider === 'sandbox'
            ? 'Simulated payment; no money collected'
            : 'Provider-confirmed test payment',
      },
    });
    return order;
  });
  if (result)
    console.info(
      `[DEV EMAIL] To: ${result.email}\nYour ORVEN ${provider === 'sandbox' ? 'sandbox ' : ''}order ${result.number} is confirmed.\nView: ${appUrl()}/orders/${result.accessToken}\nNo live charges or shipments in this concept store.`,
    );
}
export async function stripeCheckout(order: Awaited<ReturnType<typeof reserveOrder>>) {
  const stripe = stripeClient();
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    throw new HttpError('Configure a Stripe webhook secret before accepting test payments.', 503);
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'ORVEN order ' + order.number },
            unit_amount: order.total,
          },
          quantity: 1,
        },
      ],
      success_url: appUrl() + '/orders/' + order.accessToken,
      cancel_url: appUrl() + '/checkout?resume=' + order.accessToken,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: order.idempotencyKey },
  );
  await db.payment.update({ where: { orderId: order.id }, data: { providerId: session.id } });
  return session.url;
}
