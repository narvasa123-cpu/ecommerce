import { db } from './db';
import { cartId } from './security';
import { priceOrder } from './pricing';
import { productInclude } from './catalog';
export async function getCart(country = 'US', delivery = 'standard') {
  const id = await cartId();
  const pending = id
    ? await db.order.findFirst({
        where: { cartId: id, status: 'PENDING' },
        select: { accessToken: true, payment: { select: { provider: true } } },
      })
    : null;
  const cart = id
    ? await db.cart.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              variant: { include: { inventory: true, product: { include: productInclude } } },
            },
          },
        },
      })
    : null;
  const promotion = cart?.promotionCode
    ? await db.promotion.findUnique({ where: { code: cart.promotionCode } })
    : null;
  let promoError = '';
  let totals;
  try {
    totals = priceOrder(
      cart?.items.map((i) => ({ price: i.variant.product.price, quantity: i.quantity })) || [],
      country,
      delivery,
      promotion,
    );
  } catch (e) {
    promoError = e instanceof Error ? e.message : 'Promotion unavailable';
    totals = priceOrder(
      cart?.items.map((i) => ({ price: i.variant.product.price, quantity: i.quantity })) || [],
      country,
      delivery,
    );
  }
  return {
    id,
    pendingOrder: pending
      ? { token: pending.accessToken, provider: pending.payment?.provider || 'sandbox' }
      : null,
    items: cart?.items || [],
    promotionCode: cart?.promotionCode || '',
    promoError,
    totals,
  };
}
