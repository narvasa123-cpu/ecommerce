import { db } from './db';
import { HttpError, requireAdmin } from './security';
import { transactionLock } from './transaction-lock';
import { money } from './pricing';
import { salePrice, percentageChange, unusualSales, undoAllowed } from './commerce-tools';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
export async function priceDropNotifications(tx: Prisma.TransactionClient, product: { id: string; name: string; slug: string; price: number; salePercent: number }, oldPrice: number) {
  const price = salePrice(product);
  if (price >= oldPrice) return;
  const favorites = await tx.favorite.findMany({ where: { productId: product.id } });
  if (favorites.length) await tx.customerNotification.createMany({ data: favorites.map(f => ({
    userId: f.userId, title: 'A saved piece, now less',
    message: `${product.name} dropped from ${money(oldPrice)} to ${money(price)}. Current price and stock apply at checkout.`,
    href: `/products/${product.slug}`,
  })) });
}
export async function saveUndo(tx: Prisma.TransactionClient, actorId: string, kind: string, entityId: string, before: unknown, after: unknown) {
  return tx.undoAction.create({ data: { actorId, kind, entityId, before: JSON.stringify(before), after: JSON.stringify(after), expiresAt: new Date(Date.now() + 5 * 60000) } });
}
export async function undoStaffAction(body: unknown) {
  const admin = await requireAdmin();
  const { id } = z.object({ id: z.string().max(100) }).parse(body);
  return db.$transaction(async tx => {
    await transactionLock(tx, `undo:${id}`);
    const action = await tx.undoAction.findUnique({ where: { id } });
    if (!action || !undoAllowed(action, admin.id)) throw new HttpError('This undo has expired, was already used, or belongs to another administrator.', 409);
    const before = JSON.parse(action.before), after = JSON.parse(action.after);
    if (action.kind === 'PRODUCT_PRICE') {
      await transactionLock(tx, `product:${action.entityId}`);
      const current = await tx.product.findUniqueOrThrow({ where: { id: action.entityId } });
      const changed = await tx.product.updateMany({ where: { id: action.entityId, price: after.price, salePercent: after.salePercent },
        data: { price: before.price, salePercent: before.salePercent } });
      if (!changed.count) throw new HttpError('The price changed again. Undo would overwrite newer work.', 409);
      await priceDropNotifications(tx, { ...current, price: before.price, salePercent: before.salePercent }, salePrice(current));
    } else if (action.kind === 'INVENTORY') {
      await transactionLock(tx, `inventory:${action.entityId}`);
      const latest = await tx.stockMovement.findFirst({ where: { variantId: action.entityId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      if (latest?.id !== after.movementId) throw new HttpError('Stock has moved since that edit. Use a new adjustment instead.', 409);
      const changed = await tx.inventory.updateMany({ where: { variantId: action.entityId, quantity: after.quantity }, data: { quantity: before.quantity } });
      if (!changed.count) throw new HttpError('Stock changed again. Undo would overwrite a reservation or newer work.', 409);
      await tx.stockMovement.create({ data: { variantId: action.entityId, delta: before.quantity - after.quantity, reason: `Undo ${id} by ${admin.name}` } });
    } else throw new HttpError('This action cannot be undone.');
    await tx.undoAction.update({ where: { id }, data: { usedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: admin.id, action: 'ACTION_UNDONE', entityId: action.entityId, detail: `${action.kind}: ${id}` } });
    return { ok: true };
  });
}
export function comparisonWindows(now = new Date()) {
  const shifted = new Date(now.getTime() + 8 * 3600000);
  const day = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 8 * 3600000);
  const week = new Date(day.getTime() - ((shifted.getUTCDay() + 6) % 7) * 86400000);
  return { day, week, now, yesterday: new Date(day.getTime() - 86400000), yesterdayEnd: new Date(now.getTime() - 86400000),
    lastWeek: new Date(week.getTime() - 7 * 86400000), lastWeekEnd: new Date(now.getTime() - 7 * 86400000) };
}
export async function staffOverview() {
  const admin = await requireAdmin();
  const windows = comparisonWindows();
  const revenue = async (start: Date, end: Date) => {
    const result = await db.order.aggregate({ where: { createdAt: { gte: start, lt: end }, payment: { status: 'PAID' } }, _sum: { total: true }, _count: true });
    return { total: result._sum.total || 0, orders: result._count };
  };
  const since = new Date(Date.now() - 90 * 86400000);
  const [today, yesterday, week, lastWeek, low, pending, failed, unfulfilled, sold, undo] = await Promise.all([
    revenue(windows.day, windows.now), revenue(windows.yesterday, windows.yesterdayEnd),
    revenue(windows.week, windows.now), revenue(windows.lastWeek, windows.lastWeekEnd),
    db.variant.findMany({ where: { product: { active: true }, inventory: { quantity: { lte: 3 } } }, include: { product: true, inventory: true }, take: 50, orderBy: { sku: 'asc' } }),
    db.order.count({ where: { status: 'PENDING' } }),
    db.payment.count({ where: { status: 'FAILED', order: { createdAt: { gte: windows.yesterday } } } }),
    db.order.count({ where: { status: 'PAID', payment: { status: 'PAID' } } }),
    db.orderItem.findMany({ where: { order: { createdAt: { gte: since }, payment: { status: 'PAID' } } }, distinct: ['variantId'], select: { variantId: true } }),
    db.undoAction.findMany({ where: { actorId: admin.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  const inactive = await db.product.findMany({ where: { active: true, createdAt: { lte: since }, variants: { none: { id: { in: sold.map(s => s.variantId) } } } }, take: 50, orderBy: { name: 'asc' } });
  return { today, yesterday, week, lastWeek, todayChange: percentageChange(today.total, yesterday.total), weekChange: percentageChange(week.total, lastWeek.total),
    anomaly: unusualSales(week.total, lastWeek.total, lastWeek.orders), low, pending, failed, unfulfilled, inactive, undo };
}
