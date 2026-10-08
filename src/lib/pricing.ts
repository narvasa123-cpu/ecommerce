// Existing records remain in USD cents. One fixed rate is shared by the
// storefront, admin editors, exports and PHP payment settlement.
// Source: https://taxcalculator.com.ph/exchange-rates (5 October 2026).
export const PHP_PER_USD = 62.647;
export const FX_REFERENCE_DATE = '2026-10-05';
export const FREE_STANDARD_SHIPPING_THRESHOLD_PHP = 500;
// Stored totals use USD cents. Round up so an amount below ₱500 never qualifies.
export const FREE_STANDARD_SHIPPING_THRESHOLD = Math.ceil(
  (FREE_STANDARD_SHIPPING_THRESHOLD_PHP * 100) / PHP_PER_USD,
);
export const toPhpMinor = (cents: number) => Math.round((cents * 626470) / 10000);
export const phpAmount = (cents: number) => (toPhpMinor(cents) / 100).toFixed(2);
export const fromPhpAmount = (pesos: number) => Math.round((pesos * 100) / PHP_PER_USD);
export const conversionRounding = (totals: {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}) =>
  toPhpMinor(totals.total) -
  (toPhpMinor(totals.subtotal) -
    toPhpMinor(totals.discount) +
    toPhpMinor(totals.shipping) +
    toPhpMinor(totals.tax));
export const phpMinorMoney = (centavos: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(centavos / 100);
export const money = (cents: number) => phpMinorMoney(toPhpMinor(cents));
export const FREE_STANDARD_SHIPPING_THRESHOLD_LABEL = phpMinorMoney(
  FREE_STANDARD_SHIPPING_THRESHOLD_PHP * 100,
);
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
  if (!['PH', 'US', 'FR', 'DE', 'NL', 'IE'].includes(country))
    throw new Error(
      'We currently deliver to the Philippines, US, France, Germany, the Netherlands and Ireland.',
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
        ? ['PH', 'US'].includes(country)
          ? 2500
          : 4000
        : subtotal - discount >= FREE_STANDARD_SHIPPING_THRESHOLD
          ? 0
          : ['PH', 'US'].includes(country)
            ? 1200
            : 2000;
  // Demonstration destination tax. Replace with an approved tax service before launch.
  const tax = Math.round(
    (subtotal - discount) * (country === 'PH' ? 0.12 : country === 'US' ? 0.08 : 0.2),
  );
  return { subtotal, discount, shipping, tax, total: subtotal - discount + shipping + tax };
}
