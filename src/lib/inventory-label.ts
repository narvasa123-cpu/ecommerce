export function lowStockLabel(quantity: number, madeToOrder = false) {
  return !madeToOrder && quantity > 0 && quantity <= 3 ? `Low stock · ${quantity} left` : null;
}
