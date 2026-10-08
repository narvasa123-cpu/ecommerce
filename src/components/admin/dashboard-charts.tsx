'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/pricing';

export function DateRange({ days }: { days: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="a-range-control">
      Reporting period
      <select
        value={days}
        disabled={pending}
        onChange={(event) => {
          const query = new URLSearchParams(window.location.search);
          query.set('days', event.target.value);
          startTransition(() => router.push('/admin?' + query.toString(), { scroll: false }));
        }}
        aria-label="Reporting period"
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
      </select>
      <span role="status">
        {pending ? 'Updating analytics…' : 'Compared with preceding period'}
      </span>
    </label>
  );
}

export function RevenueChart({ points }: { points: { date: string; value: number }[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const activePoint = selected === null ? undefined : points[selected];
  const max = Math.max(100, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="a-chart">
      <div className="a-chart-summary">
        <strong>{money(total)}</strong>
        <span>Paid orders · includes delivery and tax</span>
      </div>
      <div className="a-chart-readout" aria-live="polite">
        {!activePoint
          ? 'Select a bar to inspect daily revenue'
          : `${activePoint.date}: ${money(activePoint.value)}`}
      </div>
      <div className="a-chart-plot">
        <div className="a-chart-axis">
          <span>{money(max)}</span>
          <span>{money(Math.round(max / 2))}</span>
          <span>{money(0)}</span>
        </div>
        <div className="a-chart-bars" aria-label="Daily paid order revenue">
          {points.map((p, index) => (
            <button
              key={p.date}
              type="button"
              className="a-chart-column"
              onClick={() => setSelected(index)}
              onFocus={() => setSelected(index)}
              onMouseEnter={() => setSelected(index)}
              aria-label={`${p.date}: ${money(p.value)}`}
              aria-pressed={selected === index}
            >
              <span style={{ height: Math.max(p.value ? 2 : 0, (p.value / max) * 100) + '%' }} />
            </button>
          ))}
        </div>
      </div>
      <div className="a-chart-dates">
        <span>{points[0]?.date}</span>
        <span>{points.at(-1)?.date}</span>
      </div>
      {total === 0 && (
        <p className="a-muted">
          No paid orders in this period. Revenue will appear after a confirmed payment.
        </p>
      )}
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
              {points.map((p) => (
                <tr key={p.date}>
                  <td>{p.date}</td>
                  <td>{money(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function CustomerChart({ points }: { points: { date: string; value: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const line = points
    .map(
      (p, i) => `${12 + (i / Math.max(1, points.length - 1)) * 376},${125 - (p.value / max) * 108}`,
    )
    .join(' ');
  return (
    <div className="a-growth-chart">
      <svg
        viewBox="0 0 400 145"
        role="img"
        aria-label={`Cumulative new customer accounts in this period: ${points.at(-1)?.value ?? 0}`}
      >
        {[17, 71, 125].map((y) => (
          <line key={y} x1="12" x2="388" y1={y} y2={y} stroke="var(--a-line)" />
        ))}
        <polygon points={`12,125 ${line} 388,125`} fill="#a8895b20" />
        <polyline points={line} fill="none" stroke="var(--brass)" strokeWidth="2.5" />
        {points
          .filter(
            (_, i) =>
              i % Math.max(1, Math.floor(points.length / 6)) === 0 || i === points.length - 1,
          )
          .map((p) => {
            const i = points.indexOf(p);
            return (
              <circle
                key={p.date}
                cx={12 + (i / Math.max(1, points.length - 1)) * 376}
                cy={125 - (p.value / max) * 108}
                r="3"
                fill="var(--espresso)"
              >
                <title>
                  {p.date}: {p.value} accounts
                </title>
              </circle>
            );
          })}
      </svg>
      <div className="a-chart-dates">
        <span>{points[0]?.date}</span>
        <span>{points.at(-1)?.date}</span>
      </div>
      <details className="a-chart-data">
        <summary>View customer growth values</summary>
        <table>
          <thead>
            <tr>
              <th>Date (UTC)</th>
              <th>New accounts to date</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date}>
                <td>{p.date}</td>
                <td>{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
