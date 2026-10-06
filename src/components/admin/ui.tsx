import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Plus,
  SearchX,
} from 'lucide-react';
import { statusLabel, type AdminQuery } from '@/lib/admin';
export function PageHeading({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
  back?: string;
}) {
  return (
    <div className="a-page-heading">
      <div>
        {back && (
          <Link className="a-back" href={back}>
            <ArrowLeft size={15} aria-hidden="true" /> Back to {back.split('/').pop()}
          </Link>
        )}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && (
        <Link className="a-btn primary" href={action.href}>
          <Plus size={16} aria-hidden="true" />
          {action.label}
        </Link>
      )}
    </div>
  );
}
export function Badge({ value, label }: { value: string; label?: string }) {
  const tone = ['PAID', 'DELIVERED', 'ACTIVE', 'AVAILABLE'].includes(value)
    ? 'green'
    : ['PENDING', 'PROCESSING', 'LOW'].includes(value)
      ? 'amber'
      : ['FAILED', 'CANCELLED', 'OUT', 'EXPIRED'].includes(value)
        ? 'red'
        : value === 'SHIPPED'
          ? 'blue'
          : 'neutral';
  return (
    <span className={'a-badge ' + tone}>
      <span aria-hidden="true" />
      {label || statusLabel(value)}
    </span>
  );
}
export function Filters({
  section,
  query,
  states = [],
  sorts = [],
  exportable = false,
}: {
  section: string;
  query: AdminQuery;
  states?: [string, string][];
  sorts?: [string, string][];
  exportable?: boolean;
}) {
  const params = new URLSearchParams({ q: query.q, state: query.state, sort: query.sort });
  return (
    <form action={'/admin/' + section} className="a-filters">
      <div className="a-search">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label={'Search ' + section}
          name="q"
          defaultValue={query.q}
          placeholder={
            section === 'products' || section === 'inventory'
              ? 'Search by name or SKU…'
              : 'Search ' + section + '…'
          }
        />
      </div>
      {states.length > 0 && (
        <select name="state" aria-label="Filter status" defaultValue={query.state}>
          <option value="">All statuses</option>
          {states.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
      {sorts.length > 0 && (
        <select name="sort" aria-label="Sort records" defaultValue={query.sort}>
          {sorts.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
      <button className="a-btn" type="submit">
        Apply
      </button>
      {(query.q || query.state || query.sort) && (
        <Link className="a-text-link" href={'/admin/' + section}>
          Clear
        </Link>
      )}
      {exportable && (
        <a className="a-btn a-export" href={'/api/admin/export?section=' + section + '&' + params}>
          <Download size={15} aria-hidden="true" />
          Export CSV
        </a>
      )}
    </form>
  );
}
export function Pagination({
  section,
  query,
  total,
  page,
  pages,
}: {
  section: string;
  query: AdminQuery;
  total: number;
  page: number;
  pages: number;
}) {
  const link = (p: number) =>
    '/admin/' +
    section +
    '?' +
    new URLSearchParams({ q: query.q, state: query.state, sort: query.sort, page: String(p) });
  return (
    <div className="a-pagination">
      <span>
        {total
          ? `${(page - 1) * 12 + 1}–${Math.min(page * 12, total)} of ${total} records`
          : '0 records'}
      </span>
      <nav aria-label="Pagination">
        {page > 1 ? (
          <Link className="a-btn" href={link(page - 1)}>
            <ChevronLeft size={16} aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <button className="a-btn" disabled>
            <ChevronLeft size={16} aria-hidden="true" />
            Previous
          </button>
        )}
        <span>
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link className="a-btn" href={link(page + 1)}>
            Next
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <button className="a-btn" disabled>
            Next
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </nav>
    </div>
  );
}
export function Empty({ section }: { section: string }) {
  return (
    <div className="a-empty">
      <SearchX size={30} aria-hidden="true" />
      <h2>No matching {section}</h2>
      <p>Try another search or clear the filters.</p>
      <Link className="a-btn" href={'/admin/' + section}>
        Clear filters
      </Link>
    </div>
  );
}
export function Panel({
  title,
  aside,
  children,
  className = '',
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={'a-panel ' + className}>
      {title && (
        <div className="a-panel-heading">
          <h2>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
