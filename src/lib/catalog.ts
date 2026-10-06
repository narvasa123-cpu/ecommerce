import { db } from './db';
import type { Prisma } from '@prisma/client';
export const productInclude = {
  images: { orderBy: { position: 'asc' as const } },
  variants: { include: { inventory: true } },
  collection: true,
} satisfies Prisma.ProductInclude;
export type CatalogProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
export function availability(quantity: number, madeToOrder = false) {
  return madeToOrder
    ? 'Made to order'
    : quantity === 0
      ? 'Sold out'
      : quantity <= 3
        ? 'Low stock'
        : 'In stock';
}
export async function featuredProducts() {
  return db.product.findMany({
    where: { featured: true, active: true },
    include: productInclude,
    take: 4,
    orderBy: { createdAt: 'asc' },
  });
}
