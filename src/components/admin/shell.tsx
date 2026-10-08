'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers3,
  Boxes,
  Users,
  Tag,
  History,
  Inbox,
  ArrowUpRight,
  Search,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { Logout } from '@/components/auth';
import { ServiceStatus, UndoToast } from './staff-tools';
const navigation = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Collections', href: '/admin/collections', icon: Layers3 },
  { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Promotions', href: '/admin/promotions', icon: Tag },
  { label: 'Inbox', href: '/admin/inbox', icon: Inbox },
  { label: 'Activity log', href: '/admin/audit', icon: History },
  { label: 'Notification center', href: '/admin/operations', icon: Inbox },
  { label: 'Sales & inventory reports', href: '/admin/reports', icon: Layers3 },
];
export function AdminShell({
  children,
  name,
  pending,
  low,
}: {
  children: React.ReactNode;
  name: string;
  pending: number;
  low: number;
}) {
  const path = usePathname();
  const menu = useRef<HTMLDialogElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [searchArea, setSearchArea] = useState('orders');
  const current =
    navigation.find((n) => n.href === path) ||
    navigation.find((n) => n.href !== '/admin' && path.startsWith(n.href)) ||
    navigation[0];
  function links() {
    return navigation.map(({ label, href, icon: Icon }, index) => (
      <div key={href} className="a-nav-item">
        {(index === 0 || index === 7) && (
          <p className="a-nav-label">{index === 0 ? 'MAIN' : 'MANAGE'}</p>
        )}
        <Link
          key={href}
          href={href}
          prefetch={false}
          onClick={() => menu.current?.close()}
          aria-current={current.href === href ? 'page' : undefined}
          title={label}
        >
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
          {href === '/admin/orders' && pending > 0 && (
            <span className="a-nav-count">{pending}</span>
          )}
          {href === '/admin/inventory' && low > 0 && <span className="a-nav-count">{low}</span>}
        </Link>
      </div>
    ));
  }
  return (
    <div className={'admin-workspace' + (collapsed ? ' a-sidebar-collapsed' : '')}>
      <aside className="a-sidebar scrollbar-hidden" id="admin-desktop-navigation">
        <Link href="/admin" className="a-brand">
          ORVEN<span>ADMINISTRATION</span>
        </Link>
        <div className="a-store-id">
          <span className="a-store-icon">O.</span>
          <div>
            <strong>ORVEN Store</strong>
            <small>Operations workspace</small>
          </div>
        </div>
        <nav aria-label="Administration">{links()}</nav>
        <div className="a-sidebar-bottom">
          <div className="a-mode-note">
            <span className="a-mode-dot" /> Operational notice
            <p>Orders and payments are not processed live.</p>
          </div>
          <Link href="/">
            View storefront <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className="a-body">
        <header className="a-topbar">
          <button
            className="a-icon a-collapse-menu"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            aria-controls="admin-desktop-navigation"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu size={21} />
          </button>
          <button
            className="a-icon a-mobile-menu"
            aria-label="Open admin navigation"
            onClick={() => menu.current?.showModal()}
          >
            <Menu size={21} />
          </button>
          <div className="a-breadcrumb">
            Workspace <span>/</span> <strong>{current.label}</strong>
          </div>
          <form action={'/admin/' + searchArea} className="a-global-search">
            <Search size={16} aria-hidden="true" />
            <select
              aria-label="Search record type"
              value={searchArea}
              onChange={(event) => setSearchArea(event.target.value)}
            >
              <option value="orders">Orders</option>
              <option value="customers">Customers</option>
              <option value="products">Products</option>
            </select>
            <input
              name="q"
              aria-label={`Search ${searchArea}`}
              placeholder={`Search ${searchArea}...`}
            />
          </form>
          <Link
            href="/admin/operations"
            className="a-icon a-notification-link"
            aria-label={`Notification center: ${pending + low} orders and stock alerts`}
          >
            <Bell size={20} />
            {pending + low > 0 && <span className="a-notification-dot" />}
          </Link>
          <div className="a-user">
            <span className="a-avatar">{name.slice(0, 1).toUpperCase()}</span>
            <span>
              {name}
              <small>Administrator</small>
            </span>
            <Logout />
          </div>
        </header>
        <div className="a-content scrollbar-hidden">
          <ServiceStatus />
          {children}
        </div>
        <UndoToast />
        <footer className="a-footer">
          ORVEN administration
        </footer>
      </div>
      <dialog ref={menu} className="a-mobile-dialog scrollbar-hidden" aria-label="Admin navigation">
        <div className="a-dialog-title">
          <strong>ORVEN admin</strong>
          <button
            className="a-icon"
            aria-label="Close admin navigation"
            onClick={() => menu.current?.close()}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Mobile administration">{links()}</nav>
        <Link className="a-btn" href="/" onClick={() => menu.current?.close()}>
          View storefront
        </Link>
      </dialog>
    </div>
  );
}
