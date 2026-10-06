export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
export type Promo = {
  kind: string;
  value: number;
  minimum: number;
  active: boolean;
  expiresAt: Date;
  uses: number;
  usageLimit: number;
};
export function priceOrder(
  items: { price: number; quantity: number }[],
  country = 'US',
  delivery = 'standard',
  promotion?: Promo | null,
) {
  if (!['US', 'FR', 'DE', 'NL', 'IE'].includes(country))
    throw new Error(
      'We currently deliver to the US, France, Germany, the Netherlands and Ireland.',
    );
  if (!['standard', 'express'].includes(delivery))
    throw new Error('Choose standard or express delivery.');
  if (
    items.some(
      (i) =>
        !Number.isSafeInteger(i.price) ||
        i.price < 0 ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > 10,
    )
  )
    throw new Error('Please check your bag quantities.');
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let discount = 0;
  if (promotion) {
    if (
      !promotion.active ||
      promotion.expiresAt <= new Date() ||
      promotion.uses >= promotion.usageLimit ||
      subtotal < promotion.minimum
    )
      throw new Error('This code is expired, unavailable, or its minimum has not been met.');
    discount = Math.min(
      subtotal,
      promotion.kind === 'PERCENT'
        ? Math.round((subtotal * promotion.value) / 100)
        : promotion.value,
    );
  }
  const shipping =
    subtotal === 0
      ? 0
      : delivery === 'express'
        ? country === 'US'
          ? 2500
          : 4000
        : subtotal - discount >= 25000
          ? 0
          : country === 'US'
            ? 1200
            : 2000;
  // Demonstration destination tax. Replace with an approved tax service before launch.
  const tax = Math.round((subtotal - discount) * (country === 'US' ? 0.08 : 0.2));
  return { subtotal, discount, shipping, tax, total: subtotal - discount + shipping + tax };
}
