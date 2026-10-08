import Link from 'next/link';
import { orderStatusHref, type AdminQuery } from '@/lib/admin';

export function OrderStatusTabs({
  query,
  states,
}: {
  query: AdminQuery;
  states: [string, string][];
}) {
  const tabs: [string, string][] = [['', 'All orders'], ...states];
  return (
    <nav className="a-order-quick-filters" aria-label="Quick order status filters">
      {tabs.map(([state, label]) => (
        <Link
          key={state || 'all'}
          href={orderStatusHref(query, state)}
          aria-current={query.state === state ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
