import { db } from './db';
import { requireUser, HttpError, cartId } from './security';
import { transactionLock } from './transaction-lock';
import { salePrice } from './commerce-tools';
import { z } from 'zod';
import { getCart } from './cart';
const favoriteProduct = {
  select: {
    id: true,
    slug: true,
    name: true,
    price: true,
    salePercent: true,
    active: true,
    images: { take: 1, orderBy: { position: 'asc' as const }, select: { url: true, alt: true } },
  },
};
export async function customerToolsGet(path: string, request: Request) {
  const url = new URL(request.url);
  if (path === 'features/search' || path === 'features/recent') {
    const query = url.searchParams.get('q')?.trim().slice(0, 100) || '';
    const slugs = (url.searchParams.get('slugs') || '')
      .split(',')
      .filter((s) => /^[a-z0-9-]{1,100}$/.test(s))
      .slice(0, 12);
    if (path === 'features/recent' && !slugs.length) return [];
    if (path === 'features/search' && query.length < 2) return [];
    return db.product.findMany({
      where: {
        active: true,
        ...(path === 'features/recent'
          ? { slug: { in: slugs } }
          : {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } },
              ],
            }),
      },
      take: path === 'features/recent' ? 12 : 6,
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        salePercent: true,
        images: { take: 1, orderBy: { position: 'asc' }, select: { url: true, alt: true } },
      },
    });
  }
  const user = await requireUser();
  if (path === 'features/wishlist')
    return db.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { product: favoriteProduct },
    });
  if (path === 'features/notifications')
    return db.customerNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  throw new HttpError('Not found.', 404);
}
export async function customerToolsPost(path: string, body: unknown) {
  const user = await requireUser();
  if (path === 'features/wishlist') {
    const { productId, saved } = z
      .object({ productId: z.string().max(100), saved: z.boolean() })
      .parse(body);
    if (!saved) {
      await db.favorite.deleteMany({ where: { userId: user.id, productId } });
      return { saved: false };
    }
    return db.$transaction(async (tx) => {
      await transactionLock(tx, `wishlist:${user.id}`);
      if ((await tx.favorite.count({ where: { userId: user.id } })) >= 200)
        throw new HttpError('Your wishlist can hold up to 200 pieces.');
      const product = await tx.product.findFirst({ where: { id: productId, active: true } });
      if (!product) throw new HttpError('This piece is no longer available.', 404);
      const favorite = await tx.favorite.upsert({
        where: { userId_productId: { userId: user.id, productId } },
        update: {},
        create: { userId: user.id, productId, savedPrice: salePrice(product) },
        include: { product: favoriteProduct },
      });
      return { saved: true, favorite };
    });
  }
  if (path === 'features/notifications/read') {
    const { id } = z.object({ id: z.string().max(100).optional() }).parse(body);
    await db.customerNotification.updateMany({
      where: { userId: user.id, ...(id ? { id } : {}), readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
  if (path === 'features/review') {
    const {
      productId,
      rating,
      body: text,
    } = z
      .object({
        productId: z.string().max(100),
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().min(10).max(2000),
      })
      .parse(body);
    const order = await db.order.findFirst({
      where: {
        userId: user.id,
        status: 'DELIVERED',
        payment: { status: 'PAID' },
        items: {
          some: {
            variantId: {
              in: (await db.variant.findMany({ where: { productId }, select: { id: true } })).map(
                (v) => v.id,
              ),
            },
          },
        },
      },
    });
    if (!order)
      throw new HttpError(
        'Only signed-in customers with a delivered, paid purchase of this product can review it.',
        403,
      );
    await db.review.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId, orderId: order.id, rating, body: text },
      update: { rating, body: text },
    });
    return { ok: true };
  }
  if (path === 'features/reorder') {
    const { orderId } = z.object({ orderId: z.string().max(100) }).parse(body);
    const id = (await cartId(true))!;
    await db.$transaction(async (tx) => {
      await transactionLock(tx, `cart:${id}`);
      const order = await tx.order.findFirst({
        where: { id: orderId, userId: user.id, payment: { status: 'PAID' } },
        include: { items: true },
      });
      if (!order) throw new HttpError('A paid order belonging to your account is required.', 403);
      if (await tx.order.findFirst({ where: { cartId: id, status: 'PENDING' } }))
        throw new HttpError('Finish or cancel your pending checkout before reordering.', 409);
      await tx.cart.upsert({ where: { id }, create: { id }, update: {} });
      const ids = order.items.map((item) => item.variantId);
      const [variants, cartItems] = await Promise.all([
        tx.variant.findMany({
          where: { id: { in: ids } },
          include: { product: true, inventory: true },
        }),
        tx.cartItem.findMany({ where: { cartId: id, variantId: { in: ids } } }),
      ]);
      const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
      const quantities = new Map(cartItems.map((item) => [item.variantId, item.quantity]));
      for (const item of order.items) {
        const variant = variantsById.get(item.variantId);
        const quantity = (quantities.get(item.variantId) || 0) + item.quantity;
        if (
          !variant?.product.active ||
          quantity > 10 ||
          quantity > (variant.inventory?.quantity || 0)
        )
          throw new HttpError(
            `${item.name} is unavailable in that quantity. No items were added.`,
            409,
          );
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: id, variantId: item.variantId } },
          create: { cartId: id, variantId: item.variantId, quantity },
          update: { quantity },
        });
        quantities.set(item.variantId, quantity);
      }
    });
    return getCart();
  }
  throw new HttpError('Not found.', 404);
}
