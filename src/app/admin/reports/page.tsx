import Link from 'next/link';
import { requireAdmin } from '@/lib/security';
import { db } from '@/lib/db';
import { money } from '@/lib/pricing';
import { salePrice } from '@/lib/commerce-tools';
import { PrintReport } from '@/components/admin/staff-tools';
import { PageHeading, Panel } from '@/components/admin/ui';
export default async function Reports() {
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 86400000);
  const [sales, inventory, totals, salesCount, inventoryCount] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: since }, payment: { status: 'PAID' } }, orderBy: { createdAt: 'desc' }, take: 500 }),
    db.variant.findMany({ include: { product: true, inventory: true }, orderBy: { sku: 'asc' }, take: 500 }),
    db.order.aggregate({ where: { createdAt: { gte: since }, payment: { status: 'PAID' } }, _sum: { total: true } }),
    db.order.count({ where: { createdAt: { gte: since }, payment: { status: 'PAID' } } }), db.variant.count(),
  ]);
  return <div className="printable-report"><PageHeading title="Sales & inventory reports" description="Print-ready PHP reports. Choose Save as PDF in your browser's print dialog. CSV supports up to 10,000 filtered rows." /><div className="a-report-actions"><PrintReport /><Link className="a-btn" href="/api/admin/export?section=sales">Sales CSV (last 30 days)</Link><Link className="a-btn" href="/api/admin/export?section=inventory">Inventory CSV</Link></div><p>ORVEN · Test-store report · Generated {new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Asia/Manila)</p><p>Last 30 days paid sales: {money(totals._sum.total || 0)} · {salesCount} orders. Printed tables show up to 500 records each ({sales.length} sales / {inventory.length} inventory shown).</p>
    {(salesCount > 500 || inventoryCount > 500) && <p className="a-sales-alert">This PDF view is truncated. Use CSV for the full report, or narrow filters in Orders / Inventory.</p>}
    <Panel title="Paid sales — last 30 days"><div className="a-table-wrap"><table className="a-table"><thead><tr><th>Order</th><th>Date (PH)</th><th>Status</th><th>Total PHP</th></tr></thead><tbody>{sales.length ? sales.map(o => <tr key={o.id}><td>{o.number}</td><td>{o.createdAt.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</td><td>{o.status}</td><td>{money(o.total)}</td></tr>) : <tr><td colSpan={4}>No paid sales in this period.</td></tr>}</tbody></table></div></Panel>
    <Panel title="Current inventory"><div className="a-table-wrap"><table className="a-table"><thead><tr><th>Product</th><th>SKU</th><th>Available</th><th>Stock signal</th><th>Current price PHP</th></tr></thead><tbody>{inventory.map(v => <tr key={v.id}><td>{v.product.name}</td><td>{v.sku}</td><td>{v.inventory?.quantity || 0}</td><td>{!v.product.active ? 'Archived' : (v.inventory?.quantity || 0) === 0 ? 'Out of stock' : (v.inventory?.quantity || 0) <= 3 ? 'Low stock' : 'Available'}</td><td>{money(salePrice(v.product))}</td></tr>)}</tbody></table></div></Panel>
  </div>;
}
