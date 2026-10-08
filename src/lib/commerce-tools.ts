export const salePrice = (product: { price: number; salePercent?: number }) =>
  Math.round(product.price * (100 - (product.salePercent || 0)) / 100);
export function percentageChange(current: number, previous: number) {
  return previous === 0 ? null : ((current - previous) / previous) * 100;
}
export function unusualSales(current: number, previous: number, priorOrders: number) {
  const change = percentageChange(current, previous);
  return priorOrders >= 5 && change !== null && Math.abs(change) >= 50 ? change : null;
}
export const orderStages = [
  { status: 'PENDING', label: 'Ordered' }, { status: 'PAID', label: 'Confirmed' },
  { status: 'PROCESSING', label: 'Packed' }, { status: 'SHIPPED', label: 'Shipped' },
  { status: 'DELIVERED', label: 'Delivered' },
] as const;
export function orderStage(status: string) {
  return orderStages.findIndex(stage => stage.status === status);
}
export function undoAllowed(action: { actorId: string; expiresAt: Date; usedAt: Date | null }, actorId: string, now = new Date()) {
  return action.actorId === actorId && action.usedAt === null && action.expiresAt > now;
}
