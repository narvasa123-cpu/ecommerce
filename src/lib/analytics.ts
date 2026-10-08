export type SalesOrder = {
  cartId: string;
  createdAt: Date;
  shippingAddress: string;
  items: { variantId: string; name: string; unitPrice: number; quantity: number }[];
};

export function salesBreakdowns(orders: SalesOrder[], categories: Map<string, string>) {
  const products = new Map<string, { name: string; units: number; value: number }>();
  const groups = new Map<string, { name: string; units: number; value: number }>();
  const locations = new Map<string, number>();
  for (const order of orders) {
    let country = 'Unknown';
    try {
      const address: unknown = JSON.parse(order.shippingAddress);
      if (
        address &&
        typeof address === 'object' &&
        'country' in address &&
        typeof address.country === 'string' &&
        /^[A-Z]{2}$/.test(address.country)
      ) {
        country = address.country;
      }
    } catch {
      /* Retain unknown for historical invalid addresses. */
    }
    locations.set(country, (locations.get(country) || 0) + 1);
    for (const item of order.items) {
      // Snapshot name groups variants without changing historical product prices.
      const product = products.get(item.name) || { name: item.name, units: 0, value: 0 };
      const category = categories.get(item.variantId) || 'Uncategorized';
      const group = groups.get(category) || { name: category, units: 0, value: 0 };
      for (const row of [product, group]) {
        row.units += item.quantity;
        row.value += item.unitPrice * item.quantity;
      }
      products.set(item.name, product);
      groups.set(category, group);
    }
  }
  const rank = (rows: typeof products) =>
    [...rows.values()].sort(
      (a, b) => b.value - a.value || b.units - a.units || a.name.localeCompare(b.name),
    );
  return {
    products: rank(products),
    categories: rank(groups),
    locations: [...locations]
      .map(([name, orders]) => ({ name, orders }))
      .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name)),
  };
}

export function cartAbandonment(
  events: { entityId: string; createdAt: Date }[],
  paidOrders: { cartId: string; createdAt: Date }[],
  now: Date,
) {
  const carts = new Map<string, { first: number; last: number }>();
  for (const event of events) {
    const time = event.createdAt.getTime();
    const previous = carts.get(event.entityId);
    carts.set(event.entityId, {
      first: Math.min(previous?.first ?? time, time),
      last: Math.max(previous?.last ?? time, time),
    });
  }
  const latestPaid = new Map<string, number>();
  for (const order of paidOrders) {
    latestPaid.set(
      order.cartId,
      Math.max(latestPaid.get(order.cartId) ?? -Infinity, order.createdAt.getTime()),
    );
  }
  let converted = 0,
    abandoned = 0,
    active = 0;
  for (const [id, activity] of carts) {
    if ((latestPaid.get(id) ?? -Infinity) >= activity.first) converted++;
    else if (now.getTime() - activity.last >= 24 * 60 * 60 * 1000) abandoned++;
    else active++;
  }
  const eligible = converted + abandoned;
  return {
    tracked: carts.size,
    converted,
    abandoned,
    active,
    eligible,
    rate: eligible ? (abandoned / eligible) * 100 : null,
  };
}
