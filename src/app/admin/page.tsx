import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/security';
import { money } from '@/lib/pricing';
import { dateLabel, type AdminParams } from '@/lib/admin';
import { Badge, PageHeading, Panel } from '@/components/admin/ui';
import {
  ArrowUpRight,
  ShoppingBag,
  Wallet,
  Users,
  Receipt,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
export default async function Dashboard({ searchParams }: { searchParams: Promise<AdminParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const days = ['7', '30', '90'].includes(String(params.days)) ? Number(params.days) : 30;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - days + 1);
  const [paid, count, customers, low, fulfillment, recent, activity] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: since }, payment: { status: 'PAID' } },
      select: { total: true, createdAt: true },
    }),
    db.order.count({ where: { createdAt: { gte: since } } }),
    db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: since } } }),
    db.inventory.count({ where: { quantity: { lte: 3 }, variant: { product: { active: true } } } }),
    db.order.count({
      where: { status: { in: ['PAID', 'PROCESSING'] }, payment: { status: 'PAID' } },
    }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { payment: true, _count: { select: { items: true } } },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 4 }),
  ]);
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
  const max = Math.max(10000, ...buckets.map((b) => b.value));
  return (
    <>
      <div className="a-dashboard-heading">
        <PageHeading
          title="Overview"
          description="A clear view of your store, and what needs your attention."
        />
        <form className="a-date-filter">
          <label htmlFor="days">Reporting period</label>
          <select id="days" name="days" defaultValue={days}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button className="a-btn">Update</button>
        </form>
      </div>
      <div className="a-report-note">
        <span className="a-mode-dot" /> Test-store data <span>·</span> {dateLabel(since)} –{' '}
        {dateLabel(today)} <span>·</span> USD
      </div>
      <div className="a-metrics">
        {[
          {
            name: 'Paid order value',
            value: money(revenue),
            note: paid.length + ' confirmed payments',
            icon: Wallet,
          },
          {
            name: 'Total orders',
            value: String(count),
            note: 'All payment and fulfillment states',
            icon: ShoppingBag,
          },
          {
            name: 'Average paid order',
            value: paid.length ? money(Math.round(revenue / paid.length)) : '—',
            note: 'Includes delivery and estimated tax',
            icon: Receipt,
          },
          {
            name: 'New customers',
            value: String(customers),
            note: 'Registered customer accounts',
            icon: Users,
          },
        ].map(({ name, value, note, icon: Icon }) => (
          <div className="a-metric" key={name}>
            <div>
              {name}
              <Icon size={18} aria-hidden="true" />
            </div>
            <strong>{value}</strong>
            <p>{note}</p>
          </div>
        ))}
      </div>
      <div className="a-dashboard-grid">
        <Panel
          title="Sales activity"
          aside={<span className="a-muted">Paid order value · USD</span>}
        >
          <div className="a-chart">
            <div className="a-chart-summary">
              <strong>{money(revenue)}</strong>
              <span>{paid.length} paid orders in this period</span>
            </div>
            <div className="a-chart-plot">
              <div className="a-chart-axis">
                <span>{money(max)}</span>
                <span>{money(Math.round(max / 2))}</span>
                <span>$0</span>
              </div>
              <div
                className="a-chart-bars"
                role="img"
                aria-label={
                  'Daily paid order value over ' +
                  days +
                  ' days. Total ' +
                  money(revenue) +
                  '. Expand daily values below for all figures.'
                }
              >
                {buckets.map((b) => (
                  <div key={b.date.toISOString()} className="a-chart-column">
                    <div
                      style={{ height: Math.max(b.value ? 2 : 0, (b.value / max) * 100) + '%' }}
                      title={dateLabel(b.date) + ': ' + money(b.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="a-chart-dates">
              <span>{dateLabel(since)}</span>
              <span>{dateLabel(today)}</span>
            </div>
            <details className="a-chart-data">
              <summary>View daily values</summary>
              <div className="a-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date (UTC)</th>
                      <th>Paid order value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map((b) => (
                      <tr key={b.date.toISOString()}>
                        <td>{dateLabel(b.date)}</td>
                        <td>{money(b.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
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
                <p>{a.detail}</p>
                <small>{dateLabel(a.createdAt)}</small>
              </div>
            ))}
            {!activity.length && <p className="a-muted">Store changes will appear here.</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}
