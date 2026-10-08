import Link from 'next/link';
import Image from 'next/image';
import { CustomerChart, DateRange, RevenueChart } from '@/components/admin/dashboard-charts';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/security';
import { money } from '@/lib/pricing';
import { cartAbandonment, salesBreakdowns } from '@/lib/analytics';
import { dateLabel, type AdminParams } from '@/lib/admin';
import { Badge, Panel } from '@/components/admin/ui';
import {
  ArrowUpRight,
  ShoppingBag,
  Wallet,
  Users,
  Receipt,
  PackageCheck,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
export default async function Dashboard({ searchParams }: { searchParams: Promise<AdminParams> }) {
  const administrator = await requireAdmin();
  const params = await searchParams;
  const days = ['7', '30', '90'].includes(String(params.days)) ? Number(params.days) : 30;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - days + 1);
  const until = new Date(today.getTime() + 86400000);
  const period = { gte: since, lt: until };
  const previousPeriod = { gte: new Date(since.getTime() - days * 86400000), lt: since };
  const [previousPaid, previousOrders, statusGroups, customerDates, messages] = await Promise.all([
    db.order.aggregate({
      where: { createdAt: previousPeriod, payment: { status: 'PAID' } },
      _sum: { total: true },
      _count: true,
    }),
    db.order.count({ where: { createdAt: previousPeriod } }),
    db.order.groupBy({ by: ['status'], where: { createdAt: period }, _count: true }),
    db.user.findMany({
      where: { role: 'CUSTOMER', createdAt: period },
      select: { createdAt: true },
    }),
    db.supportMessage.count(),
  ]);
  const [paid, count, customers, low, fulfillment, recent, activity] = await Promise.all([
    db.order.findMany({
      where: { createdAt: period, payment: { status: 'PAID' } },
      select: {
        total: true,
        createdAt: true,
        cartId: true,
        shippingAddress: true,
        items: {
          select: { variantId: true, name: true, unitPrice: true, quantity: true, image: true },
        },
      },
    }),
    db.order.count({ where: { createdAt: period } }),
    db.user.count({ where: { role: 'CUSTOMER', createdAt: period } }),
    db.inventory.count({ where: { quantity: { lte: 3 }, variant: { product: { active: true } } } }),
    db.order.count({
      where: { status: { in: ['PAID', 'PROCESSING'] }, payment: { status: 'PAID' } },
    }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { payment: true, _count: { select: { items: true } } },
    }),
    db.auditLog.findMany({
      where: { action: { not: 'CART_ACTIVITY' } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
  ]);
  const [variants, cartEvents, previousCustomers] = await Promise.all([
    db.variant.findMany({
      where: { id: { in: [...new Set(paid.flatMap((o) => o.items.map((i) => i.variantId)))] } },
      select: { id: true, product: { select: { id: true, category: true } } },
    }),
    db.auditLog.findMany({
      where: { action: 'CART_ACTIVITY', createdAt: period },
      select: { entityId: true, createdAt: true },
    }),
    db.user.count({
      where: {
        role: 'CUSTOMER',
        createdAt: {
          gte: new Date(since.getTime() - days * 86400000),
          lt: since,
        },
      },
    }),
  ]);
  const breakdown = salesBreakdowns(paid, new Map(variants.map((v) => [v.id, v.product.category])));
  const abandonment = cartAbandonment(cartEvents, paid, new Date());
  const revenue = paid.reduce((sum, o) => sum + o.total, 0);
  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + i);
    return {
      date,
      value: paid
        .filter((o) => o.createdAt.toISOString().slice(0, 10) === date.toISOString().slice(0, 10))
        .reduce((s, o) => s + o.total, 0),
    };
  });
  const compare = (current: number, previous: number) =>
    previous > 0
      ? `${current >= previous ? '+' : ''}${(((current - previous) / previous) * 100).toFixed(1)}%`
      : null;
  const growthPoints = buckets.map((b) => ({
    date: dateLabel(b.date),
    value: customerDates.filter((c) => c.createdAt < new Date(b.date.getTime() + 86400000)).length,
  }));
  return (
    <div className="a-overview">
      <section className="a-welcome-hero" aria-labelledby="admin-welcome-title">
        <div className="a-welcome-copy">
          <span className="a-welcome-kicker">Welcome back</span>
          <h2 id="admin-welcome-title">Welcome back, {administrator.name}.</h2>
          <p>Here&apos;s what&apos;s happening with your store today.</p>
          <div className="a-welcome-meta">
            <span className="a-welcome-date">
              {dateLabel(since)} – {dateLabel(today)}
            </span>
            <DateRange days={days} />
          </div>
        </div>
        <Image
          className="a-welcome-photo"
          src="/images/hero.webp"
          alt="ORVEN leather bag in a warm studio setting"
          fill
          sizes="(max-width: 700px) 100vw, 80vw"
          priority
        />
      </section>
      <div className="a-metrics">
        {[
          {
            name: 'Paid order value',
            value: money(revenue),
            note: paid.length + ' confirmed payments',
            icon: Wallet,
            change: compare(revenue, previousPaid._sum.total ?? 0),
          },
          {
            name: 'Total orders',
            value: String(count),
            note: 'Across all payment and fulfillment states',
            icon: ShoppingBag,
            change: compare(count, previousOrders),
          },
          {
            name: 'Average paid order',
            value: paid.length ? money(Math.round(revenue / paid.length)) : '—',
            note: 'Includes delivery and estimated tax',
            icon: Receipt,
            change: compare(
              paid.length ? revenue / paid.length : 0,
              previousPaid._count ? (previousPaid._sum.total ?? 0) / previousPaid._count : 0,
            ),
          },
          {
            name: 'New customers',
            value: String(customers),
            note: 'Registered accounts in this period',
            icon: Users,
            change: compare(customers, previousCustomers),
          },
        ].map(({ name, value, note, change, icon: Icon }) => (
          <div className="a-metric" key={name}>
            <div>
              {name}
              <Icon size={18} aria-hidden="true" />
            </div>
            <strong>{value}</strong>
            <p>{note}</p>
            {change && (
              <span
                className={
                  'a-metric-change ' +
                  (change.startsWith('-') ? 'negative' : change.startsWith('+') ? 'positive' : '')
                }
                title="Compared with the preceding reporting period"
              >
                {change}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="a-dashboard-grid">
        <Panel
          title="Revenue trends"
          aside={<span className="a-muted">Paid order value · PHP</span>}
        >
          <RevenueChart
            key={days}
            points={buckets.map((b) => ({ date: dateLabel(b.date), value: b.value }))}
          />
        </Panel>
        <Panel title="Needs attention">
          <div className="a-attention">
            <Link href="/admin/orders?state=unfulfilled">
              <span className="a-attention-icon">
                <PackageCheck size={21} aria-hidden="true" />
              </span>
              <div>
                <strong>{fulfillment} orders to fulfill</strong>
                <p>Paid and ready for the next step</p>
              </div>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/admin/inventory?state=low">
              <span className="a-attention-icon warning">
                <AlertCircle size={21} aria-hidden="true" />
              </span>
              <div>
                <strong>{low} low-stock variants</strong>
                <p>3 or fewer available units</p>
              </div>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/admin/inbox">
              <span className="a-attention-icon messages">
                <MessageSquare size={21} aria-hidden="true" />
              </span>
              <div>
                <strong>{messages} customer messages</strong>
                <p>Saved customer inquiries · all time</p>
              </div>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="a-quick-actions">
            <p className="a-kicker">QUICK ACTIONS</p>
            <Link href="/admin/products/new">
              Add a product <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/admin/promotions/new">
              Create a promotion <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </Panel>
      </div>
      <div className="a-dashboard-three">
        <Panel
          title="Orders by status"
          aside={
            <Link className="a-text-link" href="/admin/orders">
              View all
            </Link>
          }
        >
          <div className="a-order-status">
            <div
              className="a-order-ring"
              style={{
                background: `conic-gradient(${
                  statusGroups.length
                    ? statusGroups
                        .map((group, i) => {
                          const colors = [
                            '#3b2a22',
                            '#a8895b',
                            '#c8bbaa',
                            '#973f36',
                            '#386145',
                            '#3c637f',
                          ];
                          const before =
                            (statusGroups.slice(0, i).reduce((sum, row) => sum + row._count, 0) /
                              count) *
                            100;
                          return `${colors[i % colors.length]} ${before}% ${before + (group._count / count) * 100}%`;
                        })
                        .join(',')
                    : 'var(--a-line) 0% 100%'
                })`,
              }}
            >
              <div>
                <strong>{count}</strong>
                <small>Total orders</small>
              </div>
            </div>
            <div className="a-status-legend">
              {statusGroups.map((group) => (
                <Link key={group.status} href={'/admin/orders?state=' + group.status}>
                  <Badge value={group.status} />
                  <strong>{group._count}</strong>
                  <span>{((group._count / count) * 100).toFixed(0)}%</span>
                </Link>
              ))}
              {!count && <p className="a-muted">No orders in this period.</p>}
            </div>
          </div>
        </Panel>
        <Panel
          title="Best-selling products"
          aside={
            <Link className="a-text-link" href="/admin/products">
              View all
            </Link>
          }
        >
          <div className="a-top-products">
            {breakdown.products.slice(0, 3).map((product) => {
              const item = paid
                .flatMap((order) => order.items)
                .find((item) => item.name === product.name);
              const productId = variants.find((variant) => variant.id === item?.variantId)?.product
                .id;
              return (
                <Link
                  key={product.name}
                  href={productId ? '/admin/products/' + productId : '/admin/products'}
                  className="a-top-product"
                >
                  {item?.image && <Image src={item.image} alt="" width={56} height={56} />}
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.units} units sold</small>
                    <span className="a-product-track">
                      <span
                        style={{
                          width:
                            (product.value / Math.max(1, breakdown.products[0].value)) * 100 + '%',
                        }}
                      />
                    </span>
                  </div>
                  <span>{money(product.value)}</span>
                </Link>
              );
            })}
            {!breakdown.products.length && (
              <p className="a-empty">Your best sellers will appear after a paid order.</p>
            )}
            <p className="a-muted">Gross item value before order discounts, delivery and tax.</p>
          </div>
        </Panel>
        <Panel title="Customer growth">
          <CustomerChart points={growthPoints} />
        </Panel>
      </div>
      <div className="a-dashboard-grid">
        <Panel title="Sales performance" className="a-analytics-panel">
          <div className="a-chart-summary">
            <strong>{money(revenue)}</strong>
            <span>
              {paid.length} paid orders of {count} total orders
            </span>
          </div>
          <p className="a-muted">
            Paid order value includes discounts, delivery and estimated tax. Pending, failed and
            cancelled payments are excluded.
          </p>
        </Panel>
        <Panel title="Customer growth" className="a-analytics-panel">
          <div className="a-chart-summary">
            <strong>{customers} new accounts</strong>
            <span>
              {previousCustomers} in the previous {days}-day period
            </span>
          </div>
          <p className="a-muted">
            {customers - previousCustomers >= 0 ? '+' : ''}
            {customers - previousCustomers} accounts compared with the previous period. Registered
            customers only; guest orders do not create accounts.
          </p>
        </Panel>
      </div>
      <div className="a-dashboard-grid">
        <Panel
          title="Product performance"
          className="a-analytics-panel"
          aside={<span className="a-muted">Ranked by gross merchandise value</span>}
        >
          <div className="a-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units sold</th>
                  <th>Gross item value</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.products.slice(0, 10).map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td>{p.units}</td>
                    <td>{money(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!breakdown.products.length && (
            <p className="a-empty">No paid product sales in this period.</p>
          )}
          <p className="a-muted">
            Historical item prices before order discounts, delivery and tax. Variants are grouped by
            their saved product name.
          </p>
        </Panel>
        <Panel title="Top categories" className="a-analytics-panel">
          <div className="a-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Units sold</th>
                  <th>Gross item value</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.categories.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{c.units}</td>
                    <td>{money(c.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!breakdown.categories.length && (
            <p className="a-empty">No category sales in this period.</p>
          )}
          <p className="a-muted">
            Paid order items grouped by current product category; ranked by gross item value.
          </p>
        </Panel>
      </div>
      <div className="a-dashboard-grid">
        <Panel title="Cart abandonment rate" className="a-analytics-panel">
          <div className="a-chart-summary">
            <strong>
              {abandonment.rate === null ? 'Awaiting data' : abandonment.rate.toFixed(1) + '%'}
            </strong>
            <span>
              {abandonment.abandoned} abandoned / {abandonment.eligible} resolved carts
            </span>
          </div>
          <p className="a-muted">
            {abandonment.converted} converted · {abandonment.active} active · {abandonment.tracked}{' '}
            tracked carts
          </p>
          <p className="a-muted">
            Distinct carts updated in this reporting period. A cart is abandoned after 24 hours
            without an update or a paid order after its first tracked update. Active carts are
            excluded from the rate. Recovered carts count as converted.
          </p>
        </Panel>
        <Panel
          title="Customer location"
          className="a-analytics-panel"
          aside={<span className="a-muted">Paid orders by delivery country</span>}
        >
          <div className="a-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Paid orders</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.locations.map((l) => (
                  <tr key={l.name}>
                    <td>
                      {l.name === 'Unknown'
                        ? l.name
                        : new Intl.DisplayNames(['en'], { type: 'region' }).of(l.name)}
                    </td>
                    <td>{l.orders}</td>
                    <td>{((l.orders / paid.length) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!breakdown.locations.length && (
            <p className="a-empty">No paid orders with location data in this period.</p>
          )}
          <p className="a-muted">
            Order destination aggregates only; no street addresses. Guest and registered customer
            orders are included.
          </p>
        </Panel>
      </div>
      <div className="a-dashboard-grid">
        <Panel
          title="Recent orders"
          aside={
            <Link className="a-text-link" href="/admin/orders">
              View all orders <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <div className="a-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order / customer</th>
                  <th>Placed</th>
                  <th>Status</th>
                  <th className="a-number">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="a-record-link" href={'/admin/orders/' + o.id}>
                        {o.number}
                      </Link>
                      <small>{o.email}</small>
                    </td>
                    <td>{dateLabel(o.createdAt)}</td>
                    <td>
                      <Badge value={o.status} />
                    </td>
                    <td className="a-number">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!recent.length && <p className="a-empty">Your first order will appear here.</p>}
          </div>
        </Panel>
        <Panel
          title="Recent activity"
          aside={
            <Link className="a-text-link" href="/admin/audit">
              View log
            </Link>
          }
        >
          <div className="a-timeline">
            {activity.map((a) => (
              <div key={a.id}>
                <span className="a-timeline-dot" />
                <strong>{a.action.toLowerCase().replaceAll('_', ' ')}</strong>
                <p className="scrollbar-hidden">{a.detail}</p>
                <small>{dateLabel(a.createdAt)}</small>
              </div>
            ))}
            {!activity.length && <p className="a-muted">Store changes will appear here.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
